# wp-smurfy-mech-data
**Summary:** Allows MWO builds from Smurfy to be easily embedded in WordPress sites.

A quick request before going further! This is my first Wordpress plugin, so there are likely some issues. When you find some, please let me know or submit pulls with fixes. Thanks!

**How it works:**
The plugin looks for the following markup in any of your posts:

    <a href="http://mwo.smurfy-net.de/mechlab#i=

If it finds any such markup, it parses out the mech chassis ID and loadout ID from the remainder of the link. (That's the 'i=' and 'l=' portion of the link.) It then requests two JSON files from mwo.smurfy-net.de. With those two JSON files in-hand, it begins creating formatted HTML and places it in the body of your post in place of your original link.

Note that the replacement of your links to Smurfy are only done for single posts. If a user is viewing several posts at once, for instance viewing all the posts of a certain category, the links are not replaced.

**How to get started:**

1. Download everything in the 'display-smurfy-mech-data' folder.
2. Make a 'display-smurfy-mech-data' folder in the 'wp-content\plugins' directory of your site.
3. Upload all the files there.
4. In your browser, go to the dashboard for your Wordpress site.
5. Click the "Plugins" item on the sidebar.
6. You should now see an entry for "Display Smurfy Mech Data" in the list of available plugins.
7. Cick the "activate" link for the plugin.

If everything works, your Smurfy links should now look something like this:

**Link Collapsed**

![Collapsed Link](wp-smurfy-mech-data-collapsed.jpg?raw=true  "Collapsed")

**Link Expanded**

![Expanded Link](wp-smurfy-mech-data-expanded.jpg?raw=true  "Expanded")

**About the files**

* **display-smurfy-mech-data.php** - This is the main file for the plugin. It does the parsing and replacing of your links.
* **display-smurfy-mech-data.css** - This is the style sheet for the plugin. I tried to keep the styling generic enough that it should work with your site's theme. However, feel free to tweak it as you need.
* **display-smurfy-mech-data.js** - Some simple jQuery to allow users to expand and collapse the mech data.
* **smurfy-item-data.php** - The data retrieved from Smurfy does not have information an equipped weapon's type (energy, ballastic, etc.), nor does it have the number of shots per ton of ammo. This file contains that information. When new weapons or ammo types are introduced, this file will need to be updated.
