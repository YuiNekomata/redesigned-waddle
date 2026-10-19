KID CLOTHING CREATOR — PORTABLE WINDOWS BUILD

START
Extract this ZIP to any folder and run KID Clothing Creator.exe.
Keep the Source folder if you want to inspect or rebuild the program;
the executable contains everything it needs to run.
No Python, SSEEdit, installation or account is needed.
Requires 64-bit Windows 10/11, .NET Framework 4.5 or later (normally included),
and a current Edge/Chrome browser with WebGL for model previews.

The program opens in an Edge app window. If Edge is unavailable it opens
in your default browser. It runs a local helper bound only to this computer.
Use Exit application at the bottom, or Exit on its notification-area icon,
to stop the helper. Closing only the browser window leaves the helper
available from the notification-area icon.

USING IT
Drop a mod ZIP, RAR, extracted mod folder or ESP/ESM/ESL.
For model previews, use the full mod with its NIF and DDS assets.
Click a thumbnail to rotate and zoom.
Check/uncheck individual keywords in the AND/SLA and Devious Devices lists.
The keyword field remains editable. Multiple tags can be combined.
Use Save KID .ini and install the INI in a new MO2 mod or Skyrim's Data folder.
Select each plugin separately when an archive contains multiple plugins.
Closing the page clears your edits.

SLOT FILTERING
Dropdowns normally show relevant options based on equipment slots and
piece names. Slot 32 shows chest/top and whole-outfit options. Slot usage
varies between mods, so this is guidance rather than proof of coverage.
The Show all tags (ignore slots) checkbox displays the entire available
catalog in both categories and the bulk dropdowns.
Filtering never deletes existing selected tags. A hidden selected tag stays
in the keyword field and exported INI; enable Show all tags to edit it.
Bulk options follow checked items, or visible items when none are checked.

SUGGEST
Name-based suggestions apply on load. Suggest adds missing slot-based tags,
even to already-tagged items, without replacing existing or custom tags.
Repeated Suggest does not duplicate tags, but restores suggested tags you
manually removed. Review slot assumptions against the actual outfit.
Body slot 32 is not a guarantee that armor is revealing.

COMPATIBILITY
Requires Keyword Item Distributor and the AND/SLA/DD consumers matching your
chosen keywords. DD keywords classify pieces; they do not create scripted,
locking devices. Unchecking a tag removes it only from this generated INI,
not from the plugin or other existing KID patches.
Read po3_KeywordItemDistributor.log after launching Skyrim to verify rules.
No in-game distribution test has been performed for this testing build.

Preview support: common Skyrim SE NIF 20.2.0.7 geometry and common DDS textures.
Uses the first available referenced female worn model, then male, then an
inventory model as fallback. Does not combine all race/addon/texture variants.
Previews approximate lighting and alpha cutouts; no physics or game shaders.
Missing/unsupported textures appear teal; do not use these to judge transparency.
Embedded body geometry is hidden by default using mesh/texture-name hints.

RAR uses Windows tar. No archive-controlled paths are extracted to disk;
only an input copy and intermediate ZIP are stored temporarily and removed.
ZIP supports standard stored/deflated archives. BSA, 7z, encrypted archives,
split archives and ZIP64 are unsupported. Extract them and select the folder.
Limits: 1 GB archive, 256 MB per relevant file, 512 MB relevant files total,
256 relevant files. Duplicate plugin/asset alternatives require choosing
an installed mod folder so the correct versions can be identified.

SHARING AND SOURCE
Share this ZIP, which includes the program and source but no Skyrim mod assets.
This is an unsigned personal utility build, not an official Bethesda release.
SHA256.txt identifies this executable. Source/Build.cmd rebuilds it using
Windows' .NET Framework compiler; no package download is needed.
Source edits require rebuilding the EXE to update its embedded interface.

CHECKS
Tested the EXE's embedded interface, slot filtering, Show all tags, preserved
selections, additive Suggest, model thumbnail, INI download, direct import of
the supplied Cursed Revenant RAR, and authenticated shutdown. No browser
script errors occurred during those checks. Other mods may need manual review.

Format reference: https://www.nexusmods.com/skyrimspecialedition/mods/55728
NIF layout reference: https://github.com/niftools/nifxml

SAVE INI AS ZIP
Save INI as ZIP downloads the selected plugin's current generated INI inside
a standard ZIP archive. The INI is at the archive root, with its original
AND_<plugin stem>_KID.ini filename. It uses exactly the same selected tags
and export-family switches as Save KID .ini. The original ESP and mod assets
are not included. Both save buttons are disabled when no rules are selected.
