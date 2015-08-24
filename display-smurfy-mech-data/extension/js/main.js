var SmurfyExtension = {};

SmurfyExtension.addContainers = function( useTooltipMode ) {
  var urlPrefix = '';
  var smurfyHrefs = $("a[href^=\"http://mwo.smurfy-net.de/mechlab#\"]:not([data-formatted=\"true\"])");
  if( smurfyHrefs.length == 0 ) {
    return;
  }
  smurfyHrefs.each( function() {
    var _this = $(this);

    if( useTooltipMode === true ) {
      chrome.runtime.sendMessage(
        { type : "getUrl" },
        function( response ) {
          var url = response.url;
          var protocol = "http";
          // Figure out if this was served via http or https
          if( url.indexOf('https://') >= 0 ) {
            protocol = "https";
          }
          // Find the i (chassis) and l (loadout) elements.
          // ex: http://mwo.smurfy-net.de/mechlab#i=149&l=dcb89a08b427c09bcbe841de0bf39cbc76f7cc06
          var regEx = new RegExp("#i=(.*)&l=(.*)");
          var elements = regEx.exec( _this.attr('href') );
          if( elements !== null &&
            elements.length === 3 ) {
            _this[0].outerHTML = '<iframe src="'+ protocol + '://mwo.smurfy-net.de/tools/mechtooltip?i='+ elements[1] + '&l=' + elements[2] + '" width="100%" height="300"></iframe>';
          }
        } );
    } else {
      if( _this.text().indexOf( urlPrefix ) >= 0 ) {
        _this.text( "Build" );
      }
      // We add the formatted tag so that it, if somehow the plugin
      // runs over the page a second time, it doesn't get formatted
      // in that second pass.
      _this.attr( 'data-formatted', true );
      _this[0].outerHTML = '<div class="dsmd-container dsmd-animation"> \
                              <div class="dsmd-title">' + _this[0].outerHTML +
                                '<span class="dsmd-expander dsmd-expander-arrow-down"></span> \
                              </div> \
                            </div>\n';
    }
  } );
  SmurfyApp.initialize( true );
};

/**********************************************
 Content Script start
 **********************************************/

chrome.runtime.sendMessage(
  {
    type    : "getOption",
    option  : "useTooltipMode"
  },
  function( response ) {
    var useTooltipMode = response.optionValue === "true" ? true : false;
    SmurfyExtension.addContainers( useTooltipMode );
  } );