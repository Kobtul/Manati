/**
* Created by raulbeniteznetto on 2/8/17.
*/
function ReaderProfile(analysis_session_logic_obj){
    var reader;
    var _progress;
    var _aslo = analysis_session_logic_obj;

    function abortRead() {
        reader.abort();
    }

    function errorHandler(evt) {
        switch(evt.target.error.code) {
          case evt.target.error.NOT_FOUND_ERR:
            alert('File Not Found!');
            break;
          case evt.target.error.NOT_READABLE_ERR:
            alert('File is not readable');
            break;
          case evt.target.error.ABORT_ERR:
            break; // noop
          default:
            alert('An error occurred reading this file.');
        };
    }

    function updateProgress(evt) {
    // evt is an ProgressEvent.
        if (evt.lengthComputable) {
          var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
          // Increase the progress bar length.
          if (percentLoaded < 100) {
            _progress.style.width = percentLoaded + '%';
            _progress.textContent = percentLoaded + '%';
          }
        }
    }
    function choiceHeaders(possible_headers){
        var goal = "#fields";
        for(var i=0; i<possible_headers.length; i++) {
            var index = possible_headers[i].indexOf(goal);
            if (index >= 0) {
                var text = possible_headers[i].substring(goal.length + 1);
                return text.trim()
            }
        }
    }
    function handleFileSelect(evt) {
        reader = new FileReader();
        var loadform = this.id;
        reader.onloadend = function(evt) {
          console.log(label);
          if (evt.target.readyState == FileReader.DONE) {
              if (label == 'json')
              {
                  _aslo.clearJson();
                  JsonObj = JSON.parse(evt.target.result);
                  //console.log(JsonObj);
                  _aslo.showJson(JsonObj)
              }
              else if(loadform == 'load_computersmd' && label == 'md')
              {
                  var result = [];
                  var ip = "";
                  var rows = evt.target.result.split('\n');
                  var i = 0;
                  for (; i < rows.length; i++) {
                      ip = rows[i].split(':')[0];
                      if(ip != "") {
                          result.push(ip);
                          //console.log(rows[i]);
                      }
                  }
                  _aslo.parseMD(result);
              }
              else {
                  var rows = evt.target.result.split('\n');
                  if (rows[0][0] == '#') {
                      var i = 0;
                      var possible_headers = [];
                      for (; i < rows.length; i++) {
                          var row = rows[i];
                          if (row[0] == '#') possible_headers.push(row);
                          else break;
                      }
                      var header = choiceHeaders(possible_headers);
                      rows = rows.slice(i, rows.length - 2); // removing the headers and the las #close comment.
                      // in the end of the BRO files
                      _aslo.setAnalysisSessionTypeFile('bro_http_log');
                      rows.unshift(header);

                  } else if (label == 'binetflows' || label == 'binetflow') {
                      _aslo.setAnalysisSessionTypeFile('argus_netflow');
                  }
                  else {
                      _aslo.setAnalysisSessionTypeFile('cisco_file');
                  }
                  var file_rows = rows.join('\n');
                  _aslo.parseData(file_rows);
              }

          }
        };

        // Read in the image file as a binary string.
        var file = evt.target.files[0];
        var label = evt.target.files[0].name.split('.').pop().toLowerCase();
        thiz.eventBeforeParing(file);
        reader.readAsBinaryString(file);

    }
    var funcOnReady = function (){
        // _progress = document.querySelector('.percent');
        $(document).on('change','#visualize_weblogs,#visualize_profile,#load_computersmd' ,handleFileSelect);
        // document.getElementById('visualize_weblogs').addEventListener('change', handleFileSelect, false);
        $(':file').on('fileselect', function(event, numFiles, label) {
              var input = $(this).parents('.input-group').find(':text'),
                  log = numFiles > 1 ? numFiles + ' files selected' : label;
              if( input.length ) {
                  input.val(log);
              } else {
                  if( log ) alert(log);
              }
        });
        $(document).on('change', ':file', function() {
            var input = $(this),
                numFiles = input.get(0).files ? input.get(0).files.length : 1,
                label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
            input.trigger('fileselect', [numFiles, label]);
        });

    };

    $(document).ready(function() {
        funcOnReady();
    });

}

