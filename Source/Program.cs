using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

// Portable, loopback-only host. The HTML/JS assets are embedded in this executable.
// Mod archives are never executed or extracted to archive-specified disk paths.
static class Program {
    static readonly string Token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
    static readonly SemaphoreSlim Conversion = new SemaphoreSlim(1, 1);
    const long MaxEntry = 256L * 1024 * 1024, MaxTotal = 512L * 1024 * 1024;
    static TcpListener Listener;
    static volatile bool Running = true;
    static int Port;
    static NotifyIcon Tray;

    [STAThread]
    static void Main(string[] args) {
        try {
            Listener = new TcpListener(IPAddress.Loopback, 0);
            Listener.Start(); Port = ((IPEndPoint)Listener.LocalEndpoint).Port;
            if (args.Length == 2 && args[0] == "--serve-only") {
                File.WriteAllText(args[1], Port.ToString());
                Accept(); return;
            }
            Application.EnableVisualStyles();
            var menu = new ContextMenuStrip();
            menu.Items.Add("Open KID Clothing Creator", null, delegate { OpenWindow(); });
            menu.Items.Add("Exit", null, delegate { Stop(); });
            Tray = new NotifyIcon { Icon = SystemIcons.Application, Text = "KID Clothing Creator", Visible = true, ContextMenuStrip = menu };
            Tray.DoubleClick += delegate { OpenWindow(); };
            var thread = new Thread(Accept); thread.IsBackground = true; thread.Start();
            OpenWindow(); Application.Run();
        } catch (Exception e) {
            MessageBox.Show(e.Message, "KID Clothing Creator", MessageBoxButtons.OK, MessageBoxIcon.Error);
        } finally {
            Running = false; if (Listener != null) Listener.Stop();
            if (Tray != null) { Tray.Visible = false; Tray.Dispose(); }
        }
    }
    static void Stop() {
        Running = false; Listener.Stop(); Application.Exit();
    }
    static void OpenWindow() {
        string url = "http://127.0.0.1:" + Port + "/";
        string edge = new[] {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe")
        }.FirstOrDefault(File.Exists);
        if (edge != null) Process.Start(new ProcessStartInfo(edge, "--app=" + url) { UseShellExecute = false });
        else Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }
    static void Accept() {
        while (Running) {
            try { var client = Listener.AcceptTcpClient(); ThreadPool.QueueUserWorkItem(delegate { Handle(client); }); }
            catch (SocketException) { if (Running) throw; }
            catch (ObjectDisposedException) { break; }
        }
    }
    static void Reply(Stream output, int status, string type, byte[] data) {
        string name = status == 200 ? "OK" : status == 204 ? "No Content" : status == 404 ? "Not Found" : status == 403 ? "Forbidden" : "Bad Request";
        byte[] header = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + " " + name + "\r\nContent-Type: " + type + "\r\nContent-Length: " + data.Length + "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n");
        output.Write(header, 0, header.Length); output.Write(data, 0, data.Length);
    }
    static byte[] Resource(string name) {
        using (var input = Assembly.GetExecutingAssembly().GetManifestResourceStream(name)) {
            if (input == null) throw new IOException("Missing application resource: " + name);
            using (var output = new MemoryStream()) { input.CopyTo(output); return output.ToArray(); }
        }
    }
    static void Handle(TcpClient client) {
        using (client) using (var stream = client.GetStream()) {
            stream.ReadTimeout = 120000; stream.WriteTimeout = 120000;
            try {
                var header = new List<byte>(); int value;
                while ((value = stream.ReadByte()) != -1) {
                    header.Add((byte)value); if (header.Count > 65536) throw new IOException("Request headers too large");
                    int n = header.Count;
                    if (n >= 4 && header[n-4] == 13 && header[n-3] == 10 && header[n-2] == 13 && header[n-1] == 10) break;
                }
                string[] lines = Encoding.ASCII.GetString(header.ToArray()).Split(new[] { "\r\n" }, StringSplitOptions.None);
                string[] request = lines[0].Split(' '); if (request.Length < 2) throw new IOException("Invalid request");
                string method = request[0], path = request[1].Split('?')[0];
                var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (string line in lines.Skip(1)) { int colon = line.IndexOf(':'); if (colon > 0) headers[line.Substring(0, colon)] = line.Substring(colon + 1).Trim(); }
                string host; if (!headers.TryGetValue("Host", out host) || host != "127.0.0.1:" + Port) { Reply(stream, 403, "text/plain", new byte[0]); return; }
                if (method == "GET") {
                    if (path == "/session") { Reply(stream, 200, "application/json", Encoding.UTF8.GetBytes("{\"token\":\"" + Token + "\",\"desktop\":true}")); return; }
                    if (path == "/favicon.ico") { Reply(stream, 204, "image/x-icon", new byte[0]); return; }
                    string resource = path == "/" || path == "/KID%20Creator.html" ? "app.html" : path == "/core.js" ? "core.js" : path == "/previews.js" ? "previews.js" : null;
                    if (resource == null) { Reply(stream, 404, "text/plain", new byte[0]); return; }
                    Reply(stream, 200, resource.EndsWith("html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", Resource(resource)); return;
                }
                string token, origin;
                if (method != "POST" || !headers.TryGetValue("X-KID-Token", out token) || token != Token ||
                    (headers.TryGetValue("Origin", out origin) && origin != "http://127.0.0.1:" + Port)) { Reply(stream, 403, "text/plain", new byte[0]); return; }
                if (path == "/stop") { Reply(stream, 204, "text/plain", new byte[0]); Stop(); return; }
                if (path != "/rar") { Reply(stream, 404, "text/plain", new byte[0]); return; }
                long length; string lengthText;
                if (!headers.TryGetValue("Content-Length", out lengthText) || !long.TryParse(lengthText, out length) || length <= 0 || length > 1024L * 1024 * 1024) throw new IOException("Archive must be smaller than 1 GB.");
                if (!Conversion.Wait(0)) throw new IOException("Another archive is being opened. Try again after it finishes.");
                string temp = Path.Combine(Path.GetTempPath(), "KIDCreator-" + Guid.NewGuid().ToString("N")), input = Path.Combine(temp, "input.rar"), output = Path.Combine(temp, "output.zip");
                Directory.CreateDirectory(temp);
                try {
                    using (var file = File.Create(input)) {
                        var buffer = new byte[1024 * 1024]; long remaining = length;
                        while (remaining > 0) { int n = stream.Read(buffer, 0, (int)Math.Min(buffer.Length, remaining)); if (n <= 0) throw new IOException("Incomplete archive upload"); file.Write(buffer, 0, n); remaining -= n; }
                    }
                    ConvertRar(input, output);
                    using (var file = File.OpenRead(output)) {
                        byte[] response = Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: application/zip\r\nContent-Length: " + file.Length + "\r\nConnection: close\r\n\r\n");
                        stream.Write(response, 0, response.Length); file.CopyTo(stream);
                    }
                } finally {
                    // Only these two known files were created; never recursively delete.
                    try { File.Delete(input); File.Delete(output); Directory.Delete(temp); } catch (IOException) { }
                    Conversion.Release();
                }
            } catch (Exception e) {
                try { Reply(stream, 400, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes(e.GetBaseException().Message)); } catch (IOException) { }
            }
        }
    }
    static string Quote(string argument) {
        var b = new StringBuilder("\""); int slashes = 0;
        foreach (char c in argument) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') { b.Append('\\', slashes * 2 + 1); b.Append('"'); slashes = 0; continue; }
            b.Append('\\', slashes); slashes = 0; b.Append(c);
        }
        b.Append('\\', slashes * 2); b.Append('"'); return b.ToString();
    }
    static Process Tar(params string[] args) {
        string executable = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "tar.exe");
        if (!File.Exists(executable)) throw new IOException("Windows tar is unavailable. Use a ZIP or extracted mod folder.");
        return Process.Start(new ProcessStartInfo(executable, string.Join(" ", args.Select(Quote))) {
            UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, StandardOutputEncoding = Encoding.UTF8
        });
    }
    static void ConvertRar(string source, string destination) {
        string listing;
        using (var p = Tar("-tf", source)) {
            var task = p.StandardOutput.ReadToEndAsync();
            if (!p.WaitForExit(45000)) { p.Kill(); throw new IOException("Archive listing timed out"); }
            listing = task.Result; if (p.ExitCode != 0) throw new IOException("Cannot open this RAR. Use an unencrypted archive or extracted folder.");
        }
        var extensions = new HashSet<string>(new[] { ".esp", ".esm", ".esl", ".nif", ".dds" });
        string[] names = listing.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Where(n => extensions.Contains(Path.GetExtension(n).ToLowerInvariant())).ToArray();
        if (names.Length > 256) throw new IOException("Archive contains more than 256 relevant files. Choose a smaller mod folder.");
        long total = 0;
        using (var file = File.Create(destination)) using (var zip = new ZipArchive(file, ZipArchiveMode.Create)) {
            foreach (string name in names) {
                if (name.IndexOf('\0') >= 0 || name.IndexOf('\uFFFD') >= 0) throw new IOException("Unsupported archive filename encoding");
                using (var p = Tar("-xOf", source, "--", name)) {
                    var entry = zip.CreateEntry(name.Replace('\\', '/'), CompressionLevel.NoCompression);
                    using (var target = entry.Open()) {
                        var task = Task.Factory.StartNew(delegate {
                            try {
                                long size = 0; var buffer = new byte[1024 * 1024]; int n;
                                while ((n = p.StandardOutput.BaseStream.Read(buffer, 0, buffer.Length)) > 0) {
                                    size += n; if (size > MaxEntry || total + size > MaxTotal) throw new IOException("Archive exceeds the 256 MB per file / 512 MB total preview limit");
                                    target.Write(buffer, 0, n);
                                }
                                total += size;
                            } catch { if (!p.HasExited) p.Kill(); throw; }
                        });
                        try {
                            if (!task.Wait(45000)) { p.Kill(); task.Wait(); throw new IOException("Archive entry timed out"); }
                            p.WaitForExit(); if (p.ExitCode != 0) throw new IOException("Cannot read archive entry: " + name);
                        } finally { if (!p.HasExited) p.Kill(); }
                    }
                }
            }
        }
    }
}
