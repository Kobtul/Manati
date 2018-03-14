var _m;
function ProfilesSessionLogic() {
    thiz = this;
    _m = new Metrics(true,this);

    this.getAnalysisSessionId = function () {
        return _analysis_session_id;
    };
    this.setAnalysisSessionId = function(id){
        _analysis_session_id = id;
    };
    this.getAnalysisSessionName = function () {
        return _filename;
    };
    this.isSaved = function (){
        return _analysis_session_id !== -1
    };
    this.generateAnalysisSessionUUID = function(){
        if (_analysis_session_uuid == undefined || _analysis_session_uuid == null){
            _analysis_session_uuid = uuid.v4();
        }
    };
    this.setAnalysisSessionUUID = function(uuid){
        _analysis_session_uuid = uuid;
    };
    this.getAnalysisSessionUUID = function(){
        return _analysis_session_uuid;
    };
    this.getAnalysisSessionTypeFile = function(){
       return _analysis_session_type_file
    };
    this.setAnalysisSessionTypeFile = function(type_file){
      _analysis_session_type_file = type_file
    };
        var setFileName = function(file_name){
        $("#weblogfile-name").html(file_name);
        _filename = file_name;
    };
    function showLoading(){
         $("#loading-img").show();
    }
    function hideLoading() {
        $("#loading-img").hide();
    }
    this.getAnalysisSessionId = function () {
        return _analysis_session_id;
    };

    function on_ready_fn (){
        $(document).ready(function() {
            $("#edit-input").hide();
            $("#weblogfile-name").on('click',function(){
                var _thiz = $(this);
                var input = $("#edit-input");
                input.val(_thiz.html());
                _thiz.hide();
                input.show();
                input.focus();
            });
            $("#edit-input").on('blur',function(){
                var _thiz = $(this);
                var label = $("#weblogfile-name");
                var text_name = _thiz.val();
                if(text_name.length > 0){
                    setFileName(text_name);
                }
                _thiz.val("");
                _thiz.hide();
                label.show();
            });
            //https://notifyjs.com/
            $.notify.defaults({
              autoHide: true,
              autoHideDelay: 3000
            });
            $('#panel-datatable').hide();
            $('#save-table, #public-btn').hide();
            // $('#upload').click(function (){
            //
            // });


            //filter table
            $('body').on('click','.searching-buttons .btn', function () {
                var btn = $(this)
                var verdict = btn.data('verdict');
                if(btn.hasClass('active')){
                    _filterDataTable.removeFilter(_dt,verdict);
                    btn.removeClass('active');
                }
                else{
                    _filterDataTable.applyFilter(_dt, verdict);
                    btn.addClass('active');
                }

            } );
            $('body').on('click','.unselect', function (ev){
                ev.preventDefault();
                _filterDataTable.removeFilter(_dt);
                $('#searching-buttons .btn').removeClass('active')
            });

            $('#save-table').on('click',function(){
               saveDB();
            });

            //event for sync button
            $('#sync-db-btn').on('click',function (ev) {
               ev.preventDefault();
               syncDB(true);
            });

            $('body').on('submit','#comment-form',function(ev){
                ev.preventDefault();
                var form = $(this);
                $.ajax({
                    url: form.context.action,
                    type: 'POST',
                    data: form.serialize(),
                    dataType: 'json',
                    success: function (json){
                        $.notify(json.msg, "info");

                    },
                    error: function (xhr,errmsg,err) {
                        $.notify(xhr.status + ": " + xhr.responseText, "error");
                        console.log(xhr.status + ": " + xhr.responseText);


                    }
                })
            });

            Mousetrap.bind(['ctrl+s', 'command+s'], function(e) {
                if (e.preventDefault) {
                    e.preventDefault();
                } else {
                    // internet explorer
                    e.returnValue = false;
                }
                if(thiz.isSaved()) syncDB(true);
            });

            $("input#share-checkbox").change(function() {
                $.ajax({
                    url: '/manati_project/manati_ui/analysis_session/'+thiz.getAnalysisSessionId()+'/publish',
                    type: 'POST',
                    data: {'publish':$(this).prop('checked') ? "True": "False" },
                    dataType: 'json',
                    success: function (json){
                        $.notify(json.msg, "info");
                    },
                    error: function (xhr,errmsg,err) {
                        $.notify(xhr.status + ": " + xhr.responseText, "error");
                        console.log(xhr.status + ": " + xhr.responseText);


                    }
                })
            });
            $('#get-raw-json').on('click',function (e) {
                getProfileFromServer(_analysis_session_id);
                e.preventDefault();
            });


        });
    };
    var getProfileFromServer = function (analysis_session_id) {
        var data = {'analysis_session_id': analysis_session_id};
        $.ajax({
           type:'POST',
           data: JSON.stringify(data),
           url: "/manati_project/manati_ui/analysis_session/get_profile",

          // url: "/manati_project/manati_ui/analysis_session/sync_db",
           dataType: 'json',
           success: function(data) {
                //console.log('success',data);
                 if (Object.keys(data).length === 0)
                 {
                     $('#wrap-form-upload-computersmd').show();
                 }
                 else {
                     setFileName(data["name"]);
                     thiz.showJson(data["data"]);
                 }
           },
           error:function(exception){
               //alert('Exeption:'+exception);
               console.log(exception.toString())
           }
        });
    };
    /************************************************************
     PUBLIC FUNCTIONS
     *************************************************************/
    //INITIAL function , like a contructor
    thiz.init = function () {
        reader_files = ReaderProfile(thiz);
        draw_viz = new DrawVisualization();
        on_ready_fn();
        // window.onbeforeunload = function() {
        //     return "Mate, are you sure you want to leave? Think of the kittens!";
        // }

    };
    thiz.eventBeforeParing = function (file) {
        _size_file = file.size;
        _type_file = file.type;
        setFileName(file.name);
        showLoading();
        _m.EventFileUploadingStart(file.name, _size_file, _type_file);
        console.log("Parsing file...", file);
        $.notify("Parsing file...", "info");
    };
    thiz.clearJson = function(){
      draw_viz.clearVisualization();
    };
    thiz.showJson = function(json){
        hideLoading();
        if(_analysis_session_id == -1) {
            $("#save-profile").show(); // not sure if it is a bad practice to rely that this does not work when the element is not present
        }
       // _m.EventFileUploadingFinished(_filename);
        draw_viz.showJSON(json);
        if(document.getElementById('savefilediv')!=null) {
            draw_viz.exportToFile();
        }
    };

}
