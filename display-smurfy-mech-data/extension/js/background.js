var SmurfyExtension = {
  AjaxSettings : function( url ) {
    this.url            = url;
    this.type           = 'GET';
    this.async          = true;
    this.contentType    = "application/json";
    this.ifModified     = false;
    this.dataType       = 'json'; },
  urlDirect : "http://mwo.smurfy-net.de/api/data/",
  options : {
    targetUrlsRegex :
      [
        /www\.reddit\.com\/r\/OutreachHPG\//,
        /www\.reddit\.com\/r\/mwo\//,
        /mwomercs.com\//
      ],
    useTooltipMode : "false"
  },
  cssFiles :
    [
      "css/display-smurfy-mech-data-extension.css"
    ],
  scriptFiles :
    [
      "js/jquery-2.1.4.min.js",
      "js/underscore-min.js",
      "js/display-smurfy-mech-data.js",
      "js/main.js"
    ],
  FileInfo : function ( fileName ) {
    this.file = fileName;
    this.runAt = "document_end";
  }
};

SmurfyExtension.verifyProperty = function( testObject, propertyName ) {
  return testObject[propertyName] !== null &&
         testObject[propertyName] != undefined;
};

SmurfyExtension.onTabUpdated = function( tabID, tab ) {
  if( tab == null ||
      tab == undefined ) {
    return;
  }
  var tabUrl = tab.url;

  var isMatch = false;
  SmurfyExtension.options.targetUrlsRegex.some( function( element, index, array ) {
    var hits = element.exec( tabUrl );
    if( hits !== null &&
      hits.length > 0 ) {
      isMatch = true;
      // Break the loop.
      return true;
    }
  } );

  if( isMatch ) {
    SmurfyExtension.cssFiles.forEach( function ( element, index, array ) {
      chrome.tabs.insertCSS( tabID, new SmurfyExtension.FileInfo( element ) );
    } );
    SmurfyExtension.scriptFiles.forEach( function ( element, index, array ) {
      chrome.tabs.executeScript( tabID, new SmurfyExtension.FileInfo( element ) );
    } );
  }
};

SmurfyExtension.getOptions = function() {
  // Get the options.
  chrome.storage.sync.get(
    {
      targetUrls : "",
      useTooltipMode : "false"
    },
    function( items ) {
      if( items.targetUrls !== null &&
          items.targetUrls !== undefined &&
          items.targetUrls !== "" ) {
        var arrayUrls = JSON.parse( items.targetUrls );

        SmurfyExtension.options.targetUrlsRegex.length = 0;

        arrayUrls.forEach( function( element, index, array ) {
          // Try to make a regex from them.
          //var escaped = element.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
          var escaped = element.replace(/([.*+?^=!${}()|\[\]\/\\])/g, "\\$1");
          var newRegex = new RegExp( escaped );
          SmurfyExtension.options.targetUrlsRegex.push( newRegex );
        } );
      }
      SmurfyExtension.options.useTooltipMode = items.useTooltipMode;
    } );
};

SmurfyExtension.updateOpenTabs = function() {
  chrome.tabs.query( { status: "complete", windowType: "normal" }, function( tabs ) {
    if( tabs === null ||
        tabs.length === 0 ){
      return;
    }
    tabs.forEach( function( tab, index, array ) {
      SmurfyExtension.onTabUpdated( tab.id, tab );
    } );
  } );
};

/**********************************************
   Main program start
 **********************************************/

// setup our listeners.
chrome.runtime.onMessage.addListener( function( message, sender, sendResponse ) {
  if( !message.hasOwnProperty( "type" ) ) {
    console.assert( "No message type!" );
    return;
  }
  switch( message.type ) {
    case "getOption":
      {
        var optionValue = undefined;
        if( !SmurfyExtension.verifyProperty( message, "option" ) ) {
          console.assert( "No option specified." );
        } else {
          optionValue = SmurfyExtension.options[message.option];
        }
        sendResponse( { "optionValue" : optionValue } );
      }
      break;
    case "updateOptions":
      {
        SmurfyExtension.getOptions();
        SmurfyExtension.updateOpenTabs();
      }
      break;
    case "getUrl":
      {
        chrome.tabs.query( { active: true, currentWindow: true }, function( tabs ) {
          var activeTab = tabs[0];
          sendResponse( { url: activeTab.url } );
        } );
        // Async!
        return true;
      }
      break;
    case "fetchBuild":
      {
        // Initialize the response object.
        var responseObject = {
          success : false
        };
        // We support a loadoutID and chassisID parameter.
        // Both are required.
        if( !SmurfyExtension.verifyProperty( message, "loadoutID" ) ) {
          console.assert( "No loadout ID!" );
          sendResponse( responseObject );
          return;
        } else if( !SmurfyExtension.verifyProperty( message, "chassisID" ) ) {
          console.assert( "No chassis ID!" );
          sendResponse( responseObject );
          return;
        }
        var requestLoadout = function() {
          jQuery.ajax( new SmurfyExtension.AjaxSettings( SmurfyExtension.urlDirect + "mechs/" + message.chassisID + "/loadouts/" + message.loadoutID + ".json" ) )
            .done( function ( response, textStatus, jqXHR ) {
              responseObject.loadout = response;
              responseObject.success = true;
              sendResponse( responseObject );
            } )
            .fail( function ( jqXHR, textStatus, errorThrown ) {
              sendResponse( responseObject );
            } );
        };
        if( message.requestChassis != null &&
            message.requestChassis === true ) {
          jQuery.ajax( new SmurfyExtension.AjaxSettings( SmurfyExtension.urlDirect + "mechs/" + message.chassisID + ".json" ) )
            .done( function ( response, textStatus, jqXHR ) {
              responseObject.chassis = response;
              requestLoadout();
            } )
            .fail( function ( jqXHR, textStatus, errorThrown ) {
              sendResponse( responseObject );
            } );
        } else {
          requestLoadout();
        }
        // This tells the extension that the sendResponse call will be done
        // asynchronously, so don't invalidate the callback.
        return true;
      }
      break;
    case "setLocalStorageItem":
      {
        if( message.itemName === null ) {
          console.assert( "No item name specified." );
          return;
        } else if( message.item === null || message.item == undefined ) {
          console.assert( "No item specified." );
          return;
        }
        localStorage.setItem( message.itemName, message.item );
      }
      break;
    case "getCachedEquipment":
      {
        if( message.items === null ||
            message.items.length == 0 ) {
          console.assert( "No item name specified." );
          return;
        }

        var responseObject = {};
        message.items.forEach( function( element, index, array ) {
          responseObject[element] = localStorage.getItem( element );
        } );
        sendResponse( responseObject );
      }
      break;
    case "requestEquipmentType":
      {
        if( !message.hasOwnProperty( "equipmentType") ||
            message.equipmentType === null ) {
          console.assert( "No equipmentType specified!" );
          return;
        }

        jQuery.ajax( new SmurfyExtension.AjaxSettings( SmurfyExtension.urlDirect + message.equipmentType + ".json" ) )
          .done( function ( response, textStatus, jqXHR ) {
            localStorage.setItem( 'cached-' + message.equipmentType, JSON.stringify( response ) );
            sendResponse( { data : response } );
          } )
          .fail( function ( jqXHR, textStatus, errorThrown ) {
            console.log( jqXHR );
            console.log( textStatus );
            console.log( errorThrown );
          } );
        // This tells the extension that the sendResponse call will be done
        // asynchronously, so don't invalidate the callback.
        return true;
      }
      break;
    default:
      console.assert( "Unsupported message: [ " + message.type + " ]" );
  }
} );

chrome.tabs.onUpdated.addListener( function( tabID, changeInfo, tab ) {
  if( changeInfo.status === "loading" ) {
    SmurfyExtension.onTabUpdated( tabID, tab );
  }
} );

chrome.tabs.onCreated.addListener( function( tab ) {
  SmurfyExtension.onTabUpdated( tab.id, tab );
} );

// Get our options.
SmurfyExtension.getOptions();
SmurfyExtension.updateOpenTabs();