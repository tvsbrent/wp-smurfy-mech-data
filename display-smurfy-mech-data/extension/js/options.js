var SmurfyExtension = {
  defaultUrls :
    [
      "www.reddit.com/r/OutreachHPG/",
      "www.reddit.com/r/mwo/",
      "mwomercs.com/"
    ],
  inputMode : 'undefined'
};

// Saves options to chrome.storage
SmurfyExtension.saveOptions = function() {
  var targetUrls = [];
  var checkBoxValue = $("#inputTooltipMode:checked").val();
  var useTooltipMode = $("#inputTooltipMode:checked").val() === "on" ? "true" : "false";

  $('#targetUrls option').each( function() {
    targetUrls.push( $(this).text() );
  } );

  chrome.storage.sync.set(
    {
      targetUrls : JSON.stringify( targetUrls ),
      useTooltipMode : useTooltipMode
    },
    function() {
      chrome.runtime.sendMessage( { type: "updateOptions" } );
      window.close();
    } );
};

SmurfyExtension.restoreOptions = function() {
  var listBox = $( '#targetUrls' );

  chrome.storage.sync.get(
    {
      targetUrls      : JSON.stringify( SmurfyExtension.defaultUrls ),
      useTooltipMode  : "false"
    },
    function( items ) {
      var arrayUrls = JSON.parse( items.targetUrls );
      if( arrayUrls === null &&
          arrayUrls.length === 0 ) {
        arrayUrls = SmurfyExtension.defaultUrls;
      }
      arrayUrls.forEach( function( element, index, array ) {
        var option = $( "<option></option>" ).text( element );
        listBox.append( option );
      } );
      $("#inputTooltipMode").prop( 'checked', items.useTooltipMode === "true" ? true : false );
    } );
};

SmurfyExtension.addURL = function( e ) {
  e.preventDefault();

  SmurfyExtension.setModalState( true );
  SmurfyExtension.inputMode = "add";
  $('#inputTitle').text( "Add Entry" );
  $('#inputField').val( "" );
  $('#inputPanelWrapper').show();
};

SmurfyExtension.editURL = function( e ) {
  e.preventDefault();

  var value = $('#targetUrls').val();
  if( value === null ||
      value === undefined ) {
    return;
  }

  SmurfyExtension.setModalState( true );
  SmurfyExtension.inputMode = "edit";
  $('#inputTitle').text( "Edit Entry" );
  $('#inputField').val( value );
  $('#inputPanelWrapper').show();
};

SmurfyExtension.deleteURL = function() {
  $('#targetUrls option:selected').remove();
};

SmurfyExtension.setModalState = function( modalState ) {
  var elements = $('[data-modal-suppressed="true"]');
  elements.prop("disabled", modalState);
};

SmurfyExtension.okInput = function() {
  var value = $('#inputField').val();
  if( value === null ||
      value === undefined ||
      value === "" ) {
    return;
  }

  if( SmurfyExtension.inputMode === "add" ) {
    var option = $('<option></option>').text( value );
    $('#targetUrls').append( option );
  } else if( SmurfyExtension.inputMode === "edit" ){
    $('#targetUrls option:selected').text( value );
  }

  SmurfyExtension.setModalState( false );
  $('#inputPanelWrapper').hide();
};

SmurfyExtension.cancelInput = function() {
  SmurfyExtension.setModalState( false );
  $('#inputPanelWrapper').hide();
};

$( document ).ready( function() {
  SmurfyExtension.restoreOptions();

  $('#save').click( SmurfyExtension.saveOptions );
  $('#toolbarAdd' ).click( SmurfyExtension.addURL );
  $('#toolbarEdit' ).click( SmurfyExtension.editURL );
  $('#toolbarDelete' ).click( SmurfyExtension.deleteURL );
  $('#inputOK' ).click( SmurfyExtension.okInput );
  $('#inputCancel' ).click( SmurfyExtension.cancelInput );
} );