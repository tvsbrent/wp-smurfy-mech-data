# wp-smurfy-mech-data
##Summary:

Allows MWO builds from Smurfy to be easily embedded in WordPress sites.

A quick request before going further! This is my first WordPress plugin, so there are likely some issues. When you find some, please let me know or submit pulls with fixes. Thanks!

##How it works:
The plugin looks for the following markup in any of your posts:

    href="http://mwo.smurfy-net.de/mechlab#i=

If it finds any such markup, it wraps the anchor element the above text belongs to in some additional HTML. Once the browser receives your page, the JavaScript provided allows user to request info on that mech. Once the browser receives that mech data, the link is "expanded" and a summary of the build is viewable right in your page. 

##How to get started:

1. Download everything in the `display-smurfy-mech-data` folder.
  * You do not need to download the `dev` folder. That contains the source files for the JavaScript and CSS. You are welcome to tweak these files, you just don't need them to have the plugin function.
2. Make a `display-smurfy-mech-data` folder in the `wp-content\plugins` directory of your site.
3. Upload the files listed below to that directory.
  * `display-smurfy-mech-data.min.cs`
  * `display-smurfy-mech-data.min.js`
  * `display-smurfy-mech-data.php`
4. You will need to CHMOD **the directory** you created in Step 2 and **all the files** you put in it to 755. This sets the directory and files as readable and executable by the world. For more information on CHMOD, you can read up on it on the <a href="http://codex.wordpress.org/Changing_File_Permissions">WordPress site</a>.
5. In your browser, go to the dashboard for your WordPress site.
6. Click the "Plugins" item on the sidebar.
7. You should now see an entry for **"Display Smurfy Mech Data"** in the list of available plugins.
8. Cick the "activate" link for the plugin.

Hopefully, everything works and your Smurfy links will now look something like what you see below.

> **NOTE:** The JavaScript requires jQuery and Underscore. Both of these frameworks are installed by default with most recent WordPress installations. However, if you find that after activating this plugin your the links do not function as shown below, please enter an issue on that. There may be more work for me to do in making sure these frameworks are available. 

###Link Collapsed

![Collapsed Link](wp-smurfy-mech-data-collapsed.jpg?raw=true  "Collapsed")

###Link Expanded

![Expanded Link](wp-smurfy-mech-data-expanded.jpg?raw=true  "Expanded")

##About the files

* `**display-smurfy-mech-data.php**` - This is code that executes on your server. It has two functions. One is to look for Smurfy links and insert the markup needed by the Javascript below. The other function is to act as a router, responding to requests for mech data from the browser, grabbing that data from Smurfy's site via his API and then forwarding that data on to the browser.
* `**display-smurfy-mech-data.min.css**` - This is the style sheet for the plugin. I tried to keep the styling generic enough that it should work with your site's theme. This is the minified version of the CSS, however the source and SASS version of the style sheets are in the `dev` directory for your use.
* `**display-smurfy-mech-data.min.js**` - This is where the bulk of the work happens. Using jQuery, the user requests mech data when they expand one of the elements created by the PHP. Once the mech data is received by the browser, it is formatted using an Underscore template and is displayed to the user. Again this is a minified version, but the source is available in the `dev` directory.
