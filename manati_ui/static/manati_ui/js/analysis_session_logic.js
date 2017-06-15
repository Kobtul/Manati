/**
 * Created by raulbeniteznetto on 8/10/16.
 */
//Concurrent variables for loading data in datatable
var _dt;
var _countID =1;
var thiz;
var _db;
var _filename = '';
var _size_file,_type_file;
var _analysis_session_type_file;
var _data_uploaded,_data_headers;
var _data_headers_keys = {};
var TIME_SYNC_DB = 15000;
var _sync_db_interval;

//Concurrent variables for saving on PG DB
var _analysis_session_id = -1;
var COLUMN_DT_ID,COLUMN_REG_STATUS,COLUMN_VERDICT;
var COLUMN_END_POINTS_SERVER, COLUMN_HTTP_URL;
var COL_HTTP_URL_STR, COL_END_POINTS_SERVER_STR;
var CLASS_MC_HTTP_URL_STR, CLASS_MC_END_POINTS_SERVER_STR;
var REG_STATUS = {modified: 1};
var COL_VERDICT_STR = 'verdict';
var COL_REG_STATUS_STR = 'register_status';
var COL_DT_ID_STR = 'dt_id';
var REG_EXP_DOMAINS = /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+/;
var REG_EXP_IP = /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
var _verdicts = ["malicious","legitimate","suspicious","falsepositive", "undefined"];
var _verdicts_merged = ['malicious','legitimate','suspicious','undefined','falsepositive','malicious_legitimate',
                        'suspicious_legitimate','undefined_legitimate','falsepositive_legitimate',
                        'undefined_malicious','suspicious_malicious','falsepositive_malicious', 'falsepositive_suspicious',
                        'undefined_suspicious','undefined_falsepositive'];
var NAMES_HTTP_URL = ["http.url", "http_url", "host"];
var NAMES_END_POINTS_SERVER = ["endpoints.server", "endpoints_server", "id.resp_h", "DstAddr"];
var _flows_grouped;
var _helper;
var _filterDataTable;





var _m;


var _loadingPlugin;

function checkVerdict(_verdicts_merged, verdict){
    if (verdict == undefined || verdict == null) return verdict;
    var merged = verdict.split('_');

    if(merged.length > 1){
        var user_verdict = merged[0];
        var module_verdict = merged[1];
        var verdict_merge1 = user_verdict+"_"+module_verdict;
        var verdict_merge2 = module_verdict+"_"+user_verdict;
        if(_verdicts_merged.indexOf(verdict_merge1) > -1){
            return verdict_merge1;
        }else if(_verdicts_merged.indexOf(verdict_merge2) > -1){
            return verdict_merge2;
        }else{
            console.error("Error adding Verdict, Merged verdict is not known : " + verdict)
        }
    }else if(_verdicts_merged.indexOf(verdict) > -1){
        return verdict;
    }else {
        return null;
    }
}

function AnalysisSessionLogic(){
    /************************************************************
                            GLOBAL ATTRIBUTES
     *************************************************************/


    var stepped = 0;
    var rowCount, firstError, errorCount = 0;
    var db_name = 'weblogs_db';
    var reader_files;
    var draw_viz;
    this.columns_order_changed = false;
    thiz = this;
    _m = new Metrics(true,this);

    this.getColumnsOrderFlat =function(){
        return this.columns_order_changed;
    };
    this.setColumnsOrderFlat =function (v) {
        this.columns_order_changed = v;
    };
    this.getAnalysisSessionId = function () {
        return _analysis_session_id;
    };
    this.getAnalysisSessionName = function () {
        return _filename;
    };
    this.isSaved = function (){
        return _analysis_session_id != -1
    };
    this.getAnalysisSessionTypeFile = function(){
       return _analysis_session_type_file
    };
    this.setAnalysisSessionTypeFile = function(type_file){
      _analysis_session_type_file = type_file
    };

     /************************************************************
                            PRIVATE FUNCTIONS
     *************************************************************/

    function initDatatable(headers, data){
        var columns = [];
        for(var i = 0; i< headers.length ; i++){
            var v = headers[i];
            //columns.add({title: v, name: v, class: v});
            columns.push({title: v, name: v, class: v});
        }
        //verifying if already exist a table, in that case, destroy it
        if(_dt != null || _dt != undefined) {
            _dt.clear().draw();
            _dt.destroy();
            _dt = null;
            $('#weblogs-datatable').html('');
        }
        // create or init datatable
        _dt = $('#weblogs-datatable').DataTable({
            data: data,
            columns: columns,
            fixedHeader: {
                header: true
            },
            columnReorder: true,
            "search": {
                "regex": true
            },
            columnDefs: [
                {"searchable": false, visible: false, "targets": headers.indexOf(COL_REG_STATUS_STR)},
                {"searchable": false, visible: false, "targets": headers.indexOf(COL_DT_ID_STR)},
            ],
            "scrollX": true,
            colReorder: true,
            renderer: "bootstrap",
            responsive: true,
            buttons: ['copy','csv','excel', 'colvis',
                // {
                //     text: 'Filter by Verdicts',
                //     className: 'filter-verdicts',
                //     action: function ( e, dt, node, config ) {
                //         _filterDataTable.showMenuContext(dt,node.offset());
                //     }
                // }
            ],
            "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                //when you change the verdict, the color is updated
                var row = $(nRow);
                row.addClass(checkVerdict(_verdicts_merged, aData[COLUMN_VERDICT]));
                var str = aData[COLUMN_DT_ID].split(":");

                if(aData[COLUMN_REG_STATUS] == REG_STATUS.modified){
                    if(!row.hasClass('modified')) row.addClass('modified');
                }
                if(str.length > 1){
                    row.attr("data-dbid", str[1]);
                }else{
                    row.attr("data-dbid", str[0]);
                }
            },
            drawCallback: function(){
              $('.paginate_button.next', this.api().table().container())
                 .on('click', function(){
                     $("html, body").animate({ scrollTop: 0 }, "slow");
                 });
           },
            initComplete:   function(){
              var div_filter = $("#weblogs-datatable_filter");//.detach();
              var input_filter = div_filter.find('input').detach();
              var label_filter = div_filter.find('label').detach();
              input_filter.attr('placeholder', 'Search:');
              input_filter.css('width', 260);
              input_filter.removeClass();
              label_filter.removeClass();
              div_filter.addClass('fluid-label');
              div_filter.append(input_filter);
              div_filter.append(label_filter);

              // div_filter.appendTo('#new-search-area');

              $('.fluid-label').fluidLabel({
                focusClass: 'focused'
              });
              $('.wrap-buttons').html($('.searching-buttons').clone());

              $('.wrap-select-page').html($('.wrap-page-select').clone());
            },
             // "sPaginationType": "listbox",
            dom:'<"top"<"row"<"col-md-3"f><"col-md-3 wrap-buttons"><"col-md-1 wrap-select-page"><"col-md-5"p>>>' +
                'rt' +
                '<"bottom"<"row"<"col-md-2"l><"col-md-5"B><"col-md-5"p>>>' +
                '<"row"<"col-md-offset-7 col-md-5"<"pull-right"i>>>'+
                '<"clear">',
            "lengthMenu": [[25, 50, 100, 500], [25, 50, 100, 500]]
        });

        _dt.buttons().container().appendTo( '#weblogs-datatable_wrapper .col-sm-6:eq(0)' );
        $('#weblogs-datatable tbody').on( 'click', 'tr', function () {
            $(this).toggleClass('selected');
            $('.contextMenuPlugin').remove();
        } );
        hideLoading();
        $('#panel-datatable').show();

         _dt.on( 'column-reorder', function ( e, settings, details ) {
            thiz.setColumnsOrderFlat(true);
         });
         _dt.on( 'buttons-action', function ( e, buttonApi, dataTable, node, config ) {
            thiz.setColumnsOrderFlat(true);
        } );

        // _dt.columns(0).visible(true); // hack fixing one bug with the header of the table
         $("#weblogs-datatable").on("click", "a.virus-total-consult",function (ev) {
             ev.preventDefault();
             var elem = $(this);
             var row = elem.closest('tr');
             var query_node = elem.data('info') == 'domain' ? findDomainOfURL(elem.text()) : elem.text() ;
             row.removeClass('selected');
             consultVirusTotal(query_node);

        });

         // adding options to select datatable's pages
         var list = document.getElementsByClassName('page-select')[1];
         for(var index=0; index<_dt.page.info().pages; index++) {
             list.add(new Option((index+1).toString(), index));
         }
         $('.page-select').change(function (ev) {
             ev.preventDefault();
             var elem = $(this);

             _dt.page(parseInt(elem.val())).draw('page');

         });
         _dt.on( 'page.dt', function () {
            var info = _dt.page.info();
            $('.page-select').val(info.page);

        } );
         _dt.on('length.dt',function (){
             $('.page-select').html('');
             var list = document.getElementsByClassName('page-select')[1];
             for(var index=0; index<_dt.page.info().pages; index++) {
                 list.add(new Option((index+1).toString(), index));
             }
         });
         _dt.on('search.dt',function (){
             $('.page-select').html('');
             var list = document.getElementsByClassName('page-select')[1];
             for(var index=0; index<_dt.page.info().pages; index++) {
                 list.add(new Option((index+1).toString(), index));
             }

         });
          $("#weblogs-datatable").DataTable().draw();// better hack fixing one bug with the header of the table
    }
    function initData(data, headers) {

        _data_uploaded = data;
        _data_headers = headers;
        _data_headers_keys = {};
        _countID = 1;
        $("li#statical-nav").hide();
        var data_processed = _.map(_data_uploaded,function(v, i){
                                var values = _.values(v);
                                if(values.length < _data_headers.length){
                                    //values.add('undefined');
                                    //values.add(-1);
                                    //values.add(_countID.toString());
                                    values.push('undefined');
                                    values.push(-1);
                                    values.push(_countID.toString());
                                    _data_uploaded[i][COL_VERDICT_STR] = "undefined";
                                    _data_uploaded[i][COL_REG_STATUS_STR] = (-1).toString();
                                    _data_uploaded[i][COL_DT_ID_STR] =_countID.toString();
                                 }
                                _countID++;
                                return values
                            });
        processingFlows_WORKER(_data_uploaded);
        $.each(_data_headers,function(i, v){
            _data_headers_keys[v] = i;
        });
        console.log(data.length);
        COLUMN_DT_ID = _data_headers_keys[COL_DT_ID_STR];
        COLUMN_REG_STATUS = _data_headers_keys[COL_REG_STATUS_STR];
        COLUMN_VERDICT =  _data_headers_keys[COL_VERDICT_STR];

        COL_HTTP_URL_STR = "";
        for(var index = 0; index < NAMES_HTTP_URL.length; index++){
            var key = NAMES_HTTP_URL[index];
            if(_data_headers_keys[key]!= undefined && _data_headers_keys[key] != null){
                COL_HTTP_URL_STR = key;
                break;
            }
        }
        for(var index = 0; index < NAMES_END_POINTS_SERVER.length; index++){
            var key = NAMES_END_POINTS_SERVER[index];
            if(_data_headers_keys[key]!= undefined && _data_headers_keys[key] != null){
                COL_END_POINTS_SERVER_STR = key;
                break;
            }
        }
        // COL_HTTP_URL_STR = "http.url";
        // COL_END_POINTS_SERVER_STR = "endpoints.server";
        COLUMN_HTTP_URL = _data_headers_keys[COL_HTTP_URL_STR];
        COLUMN_END_POINTS_SERVER = _data_headers_keys[COL_END_POINTS_SERVER_STR];
        CLASS_MC_END_POINTS_SERVER_STR = COL_END_POINTS_SERVER_STR.replace(".", "_");
        CLASS_MC_HTTP_URL_STR = COL_HTTP_URL_STR.replace(".", "_");

        _filterDataTable = new FilterDataTable(COLUMN_VERDICT,_verdicts_merged);
        if(_analysis_session_type_file == "argus_netflow") {
            saveDB(_data_headers,data_processed)
        }
        else {
            initDatatable(_data_headers, data_processed);
            $('#save-table').show();
        }


    }


    function addClassVerdict(class_selector,verdict) {
        var checked_verdict = checkVerdict(_verdicts_merged, verdict);
        _dt.rows('.'+class_selector).nodes().to$().removeClass(_verdicts_merged.join(" ")).addClass(checked_verdict);
        _dt.rows('.'+class_selector).nodes().to$().addClass('modified');
        _dt.rows('.'+class_selector).nodes().to$().removeClass(class_selector);


    }
    this.markVerdict= function (verdict, class_selector) {
        if(class_selector === null || class_selector === undefined) class_selector = "selected";
        // console.log(verdict);
        var rows_affected = [];
        _dt.rows('.'+class_selector).every( function () {
            var d = this.data();
            rows_affected.add(d);
            var old_verdict = d[COLUMN_VERDICT];
            d[COLUMN_VERDICT]= verdict; // update data source for the row
            d[COLUMN_REG_STATUS] = REG_STATUS.modified;
            this.invalidate(); // invalidate the data DataTables has cached for this row

        } );
        // Draw once all updates are done
        _dt.draw(false);
        addClassVerdict(class_selector, verdict);
        return rows_affected;

    };
    var syncDB = function (show_loading){
        if(show_loading == undefined || show_loading == null) show_loading = false;
        if(show_loading) showLoading();
        var arr_list = _dt.rows('.modified').data();
        var data_row = {};
        arr_list.each(function(elem){
            if(elem[COLUMN_REG_STATUS] != -1){
                var key_id = elem[COLUMN_DT_ID].split(':').length <= 1 ? _analysis_session_id+":"+elem[COLUMN_DT_ID] : elem[COLUMN_DT_ID] ;
                data_row[key_id]=elem[COLUMN_VERDICT];
            }
        });
        var data = {'analysis_session_id': _analysis_session_id,
                        'data': data_row };
        if(thiz.getColumnsOrderFlat()){
            data['headers[]']=JSON.stringify(get_headers_info());
            thiz.setColumnsOrderFlat(false);
        }
        $.ajax({
            type:"POST",
            data: JSON.stringify(data),
            dataType: "json",
            url: "/manati_project/manati_ui/analysis_session/sync_db",
            // handle a successful response
            success : function(json) {
                // $('#post-text').val(''); // remove the value from the input
                // console.log(json); // log the returned json to the console
                var data = JSON.parse(json['data']);
                console.log(data);
                $.each(data,function (index, elem) {
                    console.log(elem);
                    var dt_id = parseInt(elem.pk.split(':')[1]);
                    var row = _dt.rows('[data-dbid="'+dt_id+'"]');
                    var index_row = row.indexes()[0];
                     row.nodes().to$().addClass('selected-sync');
                    thiz.setColumnsOrderFlat(false);
                     thiz.markVerdict(elem.fields.verdict,'selected-sync');
                    row.nodes().to$().removeClass('modified');
                    _dt.cell(index_row, COLUMN_VERDICT).data(elem.fields.verdict);
                    _dt.cell(index_row, COLUMN_REG_STATUS).data(elem.fields.register_status);



                });
                console.log("DB Synchronized");
                if(show_loading) hideLoading();
            },

            // handle a non-successful response
            error : function(xhr,errmsg,err) {
                    $('#results').html("<div class='alert-box alert radius' data-alert>Oops! We have encountered an error: "+errmsg+
                        " <a href='#' class='close'>&times;</a></div>"); // add the error to the dom
                    console.error(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    $('#save-table').attr('disabled',false).removeClass('disabled');
                    // $.notify(xhr.status + ": " + xhr.responseText, "error");
                    $.notify(xhr.status + ": " + xhr.responseText);
                    //NOTIFY A ERROR
                    clearInterval(_sync_db_interval);
                    _m.EventAnalysisSessionSavingError(_filename);
                    hideLoading();
            }

        });
    };
    thiz.parseMD = function(data){
        console.log(data);
        if (typeof _analysis_session_id !== 'undefined') {
            if(_analysis_session_type_file != "argus_netflow") {
                var data = {
                    'analysis_session_id': _analysis_session_id,
                    'data': data
                };

                try{

            $.ajax({
                type:"POST",
                data: data,
                dataType: "json",
                url: "/manati_project/manati_ui/analysis_session/create",
                // handle a successful response
                success : function(json) {
                    alert("Succes")
                },

                // handle a non-successful response
                error : function(xhr,errmsg,err) {
                    $('#results').html("<div class='alert-box alert radius' data-alert>Oops! We have encountered an error: "+errmsg+
                        " <a href='#' class='close'>&times;</a></div>"); // add the error to the dom
                    console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    $('#save-table').attr('disabled',false).removeClass('disabled');
                    $('#public-btn').hide();
                    $.notify(xhr.status + ": " + xhr.responseText, "error");
                    //NOTIFY A ERROR
                    _m.EventAnalysisSessionSavingError(_filename);
                    hideLoading();
                }
            });
        }catch(e){
            // thiz.destroyLoading();
            $.notify(e, "error");
            $('#public-btn').hide();
            $('#save-table').attr('disabled',false).removeClass('disabled');
        }





            }
            alert("Wrong typefile for creating profiles");
        }
        else {
            alert('No binetflows loaded yet');
        }
    };
    function get_headers_info(){
        // _data_headers
        var column_visibles = _dt.columns().visible();
        var headers = $.map(_dt.columns().header(),function (v,i) {
            return {order: i, column_name: v.innerHTML, visible: column_visibles[i] };
        });

        return headers;
    }
    function saveDB(headers,rows){
        try{

            showLoading();
            $.notify("Starting process to save the Analysis Session, it takes time", "info", {autoHideDelay: 6000 });
            $('#save-table').attr('disabled',true).addClass('disabled');
            rows = typeof rows !== 'undefined' ? rows : _dt.rows().data().toArray();
            headers = typeof headers !== 'undefined' ? headers : get_headers_info();
            //var rows = _dt.rows();
            _m.EventAnalysisSessionSavingStart(rows.length, _filename);
            var data = {
                filename: _filename,
                "headers[]": JSON.stringify(headers),
                'data[]': JSON.stringify(rows),
                type_file: thiz.getAnalysisSessionTypeFile()
            };
            //send the name of the file, and the first 10 registers
            $.ajax({
                type:"POST",
                data: data,
                dataType: "json",
                url: "/manati_project/manati_ui/analysis_session/create",
                // handle a successful response
                success : function(json) {
                    // $('#post-text').val(''); // remove the value from the input
                    // console.log(json); // log the returned json to the console
                    // console.log("success"); // another sanity check
                    _analysis_session_id = json['data']['analysis_session_id'];
                    setFileName(json['data']['filename']);

                    _m.EventAnalysisSessionSavingFinished(_filename,_analysis_session_id);
                    $.notify("All Weblogs ("+json['data_length']+ ") were created successfully ", 'success');
                    if(_analysis_session_type_file != "argus_netflow") {
                        _dt.column(COLUMN_REG_STATUS, {search: 'applied'}).nodes().each(function (cell, i) {
                            var tr = $(cell).closest('tr');
                            if (!tr.hasClass("modified")) cell.innerHTML = 0;
                        });
                        $('#save-table').hide();
                        $('#public-btn').show();
                        $('#wrap-form-upload-file').hide();
                        history.pushState({},
                            "Edit AnalysisSession " + _analysis_session_id,
                            "/manati_project/manati_ui/analysis_session/" + _analysis_session_id + "/edit");
                        _sync_db_interval = setInterval(syncDB, TIME_SYNC_DB);
                        hideLoading();
                        columns_order_changed = false;
                        $("#weblogfile-name").off('click');
                        $("#weblogfile-name").css('cursor', 'auto');
                        $("#sync-db-btn").show();
                        //show comment and update form
                        $("#coments-as-nav").show();
                        $('#comment-form').attr('action', '/manati_project/manati_ui/analysis_session/' +
                            _analysis_session_id + '/comment/create')
                    }
                },

                // handle a non-successful response
                error : function(xhr,errmsg,err) {
                    $('#results').html("<div class='alert-box alert radius' data-alert>Oops! We have encountered an error: "+errmsg+
                        " <a href='#' class='close'>&times;</a></div>"); // add the error to the dom
                    console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    $('#save-table').attr('disabled',false).removeClass('disabled');
                    $('#public-btn').hide();
                    $.notify(xhr.status + ": " + xhr.responseText, "error");
                    //NOTIFY A ERROR
                    _m.EventAnalysisSessionSavingError(_filename);
                    hideLoading();
                }
            });
        }catch(e){
            // thiz.destroyLoading();
            $.notify(e, "error");
            $('#public-btn').hide();
            $('#save-table').attr('disabled',false).removeClass('disabled');
        }




    }
    function showLoading(){
         $("#loading-img").show();
    }
    function hideLoading() {
        $("#loading-img").hide();
    }

    function contextMenuConfirmMsg(rows, verdict){
        $.confirm({
            title: 'Weblogs Affected',
            content: "Will " + rows.length.toString() + ' weblogs change their verdicts, is ok for you? ',
            confirm: function(){
                _dt.rows('.selected').nodes().to$().removeClass('selected');
                _dt.rows(rows).nodes().to$().addClass('selected');
                thiz.markVerdict(verdict);
            },
            cancel: function(){

            }
        });
    }
    function getWeblogsWhoisRelated(weblog_id){
        initModal("Modules Weblogs related by whois information: " + weblog_id);
        var data = {weblog_id: weblog_id};
        $.ajax({
            type:"GET",
            data: data,
            dataType: "json",
            url: "/manati_project/manati_ui/analysis_session/weblog/modules_whois_related",
            success : function(json) {// handle a successful response
                var whois_related_info = JSON.parse(json['data']);
                var was_whois_related = json['was_whois_related'];
                if(!was_whois_related){
                    $.notify("One request for the DB was realized, maybe it will take time to process it and" +
                            " show the information in the modal.",
                            "warn", {autoHideDelay: 2000});
                }
                var table = buildTable_WeblogsWhoisRelated(whois_related_info,was_whois_related);

                updateBodyModal(table);
                // var info_report = JSON.parse(json['info_report']);
                // var query_node = json['query_node'];
                // var table = buildTableInfo_VT(info_report);
                // updateBodyModal(table);
            },
            error : function(xhr,errmsg,err) { // handle a non-successful response
                $.notify(xhr.status + ": " + xhr.responseText, "error");
                console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console

            }

        });

    }

    var _bulk_marks_wbs = {};
    var _bulk_verdict;

    var generateContextMenuItems = function(tr_dom){
        var items_menu = {};
        items_menu['sep1'] = "-----------";
        if(_analysis_session_type_file == "argus_netflow") {
            return items_menu;
        }
        // var tr_active = $("tr.menucontext-open.context-menu-active");
        var bigData = _dt.rows(tr_dom).data()[0];
        var ip_value = bigData[COLUMN_END_POINTS_SERVER]; // gettin end points server ip
        var url = bigData[COLUMN_HTTP_URL];
        var domain = findDomainOfURL(url); // getting domain
        _bulk_marks_wbs[CLASS_MC_END_POINTS_SERVER_STR] = _helper.getFlowsGroupedBy(COL_END_POINTS_SERVER_STR,ip_value);
        _bulk_marks_wbs[CLASS_MC_HTTP_URL_STR] = _helper.getFlowsGroupedBy(COL_HTTP_URL_STR,domain);
        _bulk_verdict = bigData[COLUMN_VERDICT];
        _verdicts.forEach(function(v){
            items_menu[v] = {name: v, icon: "fa-paint-brush " + v }
        });

        items_menu['fold1'] = {
            name: "Mark all WBs with same: ",
            icon: "fa-search-plus",
            // disabled: function(){ return !this.data('moreDisabled'); },
            items: {
            "fold1-key1": { name:  "By IP (of column: " + COL_END_POINTS_SERVER_STR+")" +
                                    "("+_bulk_marks_wbs[CLASS_MC_END_POINTS_SERVER_STR].length+")",
                            icon: "fa-paint-brush",
                            className: CLASS_MC_END_POINTS_SERVER_STR,
                            callback: function(key, options) {
                                setBulkVerdict_WORKER(_bulk_verdict, _bulk_marks_wbs[CLASS_MC_END_POINTS_SERVER_STR]);
                                _m.EventBulkLabelingByEndServerIP(_bulk_marks_wbs[CLASS_MC_END_POINTS_SERVER_STR],_bulk_verdict, ip_value);

                            }
                        },
            "fold1-key2": { name: "By Domain (of column:" + COL_HTTP_URL_STR +")" +
                                    "("+_bulk_marks_wbs[CLASS_MC_HTTP_URL_STR].length+")",
                            icon: "fa-paint-brush",
                            className: CLASS_MC_HTTP_URL_STR,
                            callback: function(key, options) {
                                setBulkVerdict_WORKER(_bulk_verdict, _bulk_marks_wbs[CLASS_MC_HTTP_URL_STR]);
                                _m.EventBulkLabelingByDomains(_bulk_marks_wbs[CLASS_MC_HTTP_URL_STR],_bulk_verdict, domain);
                            }
                    }
        }};
        items_menu['sep2'] = "-----------";
        items_submenu_external_query = {};
        items_submenu_external_query['virus_total_consult'] = {
            name: "VirusTotal", icon: "fa-search",
            items: {
                "fold2-key1": {
                    name: "Looking for domain (of column:" + COL_HTTP_URL_STR +")",
                    icon: "fa-paper-plane-o",
                    callback: function (key, options) {
                        var qn = bigData[COLUMN_HTTP_URL];
                        consultVirusTotal(qn, "domain");

                    }
                },
                "fold2-key2": {
                    name: "Looking for IP (of column: " + COL_END_POINTS_SERVER_STR+")",
                    icon: "fa-paper-plane-o",
                    callback: function (key, options) {
                        var qn = bigData[COLUMN_END_POINTS_SERVER];
                        consultVirusTotal(qn, "ip");
                    }
                }
            }
        };
        items_submenu_external_query['whois_consult'] = {
            name: "Whois", icon: "fa-search",
            items: {
                "fold2-key1": {
                    name: "Looking for domain (of column: " + COL_HTTP_URL_STR +")",
                    icon: "fa-paper-plane-o",
                    callback: function (key, options) {
                        var qn = bigData[COLUMN_HTTP_URL];
                        consultWhois(qn, "domain");

                    }
                },
                "fold2-key2": {
                    name: "Looking for IP (of column: " + COL_END_POINTS_SERVER_STR+")",
                    icon: "fa-paper-plane-o",
                    callback: function (key, options) {
                        var qn = bigData[COLUMN_END_POINTS_SERVER];
                        consultWhois(qn, "ip");
                    }
                },
                "fold2-key3":{
                    name: "Find Weblogs Related by whois info", icon: "fa-search",
                    callback: function (key, option) {
                        var weblog_id = bigData[COLUMN_DT_ID].toString();
                        weblog_id = weblog_id.split(":").length <= 1 ? _analysis_session_id + ":" + weblog_id : weblog_id;
                        getWeblogsWhoisRelated(weblog_id);

                    }

                }
            }
        };
        items_menu['fold3'] = {
            name: "External Intelligence", icon: "fa-search",
            items: items_submenu_external_query
        };
        if(thiz.getAnalysisSessionId() != -1) {
            items_menu['fold4'] = {
                name: "Registry History", icon: "fa-search",
                items: {
                    "fold2-key1": {
                        name: "Veredict History",
                        icon: "fa-paper-plane-o",
                        callback: function (key, options) {
                            var weblog_id = bigData[COLUMN_DT_ID].toString();
                                weblog_id = weblog_id.split(":").length <= 1 ? _analysis_session_id + ":" + weblog_id : weblog_id;
                                getWeblogHistory(weblog_id);

                        }
                    },
                    "fold2-key2": {
                        name: "Modules Changes",
                        icon: "fa-paper-plane-o",
                        callback: function (key, options) {
                            var weblog_id = bigData[COLUMN_DT_ID].toString();
                            weblog_id = weblog_id.split(":").length <= 1 ? _analysis_session_id + ":" + weblog_id : weblog_id;
                            getModulesChangesHistory(weblog_id);
                        }
                    }
                }
            };
        }
        items_menu['sep3'] = "-----------";
        items_menu['fold2'] = {
            name: "Copy to clipboard", icon: "fa-files-o",
            items: {
                "fold2-key1": {
                    name: "Copy URL (of column: " + COL_HTTP_URL_STR +")",
                    icon: "fa-file-o",
                    callback: function (key, options) {
                        copyTextToClipboard(bigData[COLUMN_HTTP_URL]);
                    }
                },
                "fold2-key2": {
                    name: "Copy IP (of column: " + COL_END_POINTS_SERVER_STR+")",
                    icon: "fa-file-o",
                    callback: function (key, options) {
                        copyTextToClipboard(bigData[COLUMN_END_POINTS_SERVER]);
                    }
                }
            }
        };



        return items_menu;

    };
    function buildTableInfo_VT(info_report){
        var table = "<table class='table table-bordered table-striped'>";
        table += "<thead><tr><th style='width: 110px;'>List Attributes</th><th> Values</th></tr></thead>";
        table += "<tbody>";
            for(var key in info_report){
                table += "<tr>";
                table += "<th>"+key+"</th>";
                var info = info_report[key];
                if (info instanceof Array){
                    var html_temp = "";
                    for(var index = 0; index < info.length; index++){
                        var data = info[index];
                        if(data instanceof Object){
                             html_temp += buildTableInfo_VT(data, true) ;
                        }else if(typeof(data) == "string") {
                            table += "<td>" + info.join(", ") + "</td>" ;
                            break;
                        }

                    }
                    if(html_temp != "") table += "<td>"+ html_temp+ "</td>"
                }
                else if(info instanceof Object){
                    var html_temp = "";
                    html_temp += buildTableInfo_VT(info, true) ;
                    if(html_temp != "") table += "<td>"+ html_temp+ "</td>"
                }
                else{
                    table += "<td>" + info + "</td>" ;
                }

                table += "</tr>";
            }

        table += "</tbody>";
        table += "</table>";
        return table;

    }
    function buildTableInfo_Whois(info_report, no_title){
        if(no_title == undefined || no_title == null) no_title = false;
        var table = "<table class='table table-bordered table-striped'>";
        if(!no_title) table += "<thead><tr><th style='width: 110px;'>List Attributes</th><th> Values</th></tr></thead>";
        table += "<tbody>";
            for(var key in info_report){
                table += "<tr>";
                table += "<th>"+key+"</th>";
                var info = info_report[key];
                if (info instanceof Array){
                    var html_temp = "";
                    for(var index = 0; index < info.length; index++){
                        var data = info[index];
                        if(data instanceof Object){
                             html_temp += buildTableInfo_Whois(data, true) ;
                        }else if(typeof(data) == "string") {
                            table += "<td>" + info.join(", ") + "</td>" ;
                            break;
                        }

                    }
                    if(html_temp != "") table += "<td>"+ html_temp+ "</td>"
                }else{
                    table += "<td>" + info + "</td>" ;
                }

                table += "</tr>";
            }

        table += "</tbody>";
        table += "</table>";
        return table;

    }
    function initModal(title){
        $('#vt_consult_screen #vt_modal_title').html(title);
        $('#vt_consult_screen').modal('show');
        $('#vt_consult_screen').on('hidden.bs.modal', function (e) {
            $(this).find(".table-section").html('').hide();
            $(this).find(".loading").show();
            $(this).find("#vt_modal_title").html('');
        });
    }
    function updateBodyModal(table) {
        var modal_body = $('#vt_consult_screen .modal-body');
        if (table != null) {
            modal_body.find('.table-section').html(table).show();
            modal_body.find(".loading").hide();
        }
    }
    function consultVirusTotal(query_node, query_type){
        if(query_type == "domain") _m.EventVirusTotalConsultationByDomian(query_type);
        else if(query_type == "ip") _m.EventVirusTotalConsultationByIp(query_type);
        else{
            console.error("Error query_type for ConsultVirusTotal is incorrect")
        }
        initModal("Virus Total Query: <span>?????</span>");
        var data = {query_node: query_node, query_type: query_type};
        $.ajax({
            type:"GET",
            data: data,
            dataType: "json",
            url: "/manati_project/manati_ui/consult_virus_total",
            success : function(json) {// handle a successful response
                var info_report = JSON.parse(json['info_report']);
                var query_node = json['query_node'];
                var table = buildTableInfo_VT(info_report);
                initModal("Virus Total Query: <span>"+query_node+"</span>");
                updateBodyModal(table);
            },
            error : function(xhr,errmsg,err) { // handle a non-successful response
                $.notify(xhr.status + ": " + xhr.responseText, "error");
                console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console

            }

        })
    }
    function consultWhois(query_node, query_type){
        if(query_type == "domain") _m.EventWhoisConsultationByDomian(query_type);
        else if(query_type == "ip") _m.EventWhoisConsultationByIp(query_type);
        else{
            console.error("Error query_type for WhoisConsultation is incorrect")
        }
        initModal("Whois Query: <span>????</span>");
        var data = {query_node: query_node, query_type: query_type};
        $.ajax({
            type:"GET",
            data: data,
            dataType: "json",
            url: "/manati_project/manati_ui/consult_whois",
            success : function(json) {// handle a successful response
                var info_report = JSON.parse(json['info_report']);
                var query_node = json['query_node'];
                var table = buildTableInfo_Whois(info_report);
                initModal("Whois Query: <span>"+query_node+"</span>");
                updateBodyModal(table);
            },
            error : function(xhr,errmsg,err) { // handle a non-successful response
                $.notify(xhr.status + ": " + xhr.responseText, "error");
                console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console

            }

        })
    }

    function buildTableInfo_Wbl_History(weblog_history){
        var table = "<table class='table table-bordered table-striped'>";
        table += "<thead><tr><th>User/Module</th><th>Previous Verdict</th><th>Verdict</th><th>When?</th></tr></thead>";
        table += "<tbody>";
            _.each(weblog_history, function (value, index) {
                table += "<tr>";
                // for(var key in value){
                //     table += "<td>" + value[key]+ "</td>" ;
                // }
                table += "<td>" + value.author_name + "</td>";
                table += "<td>" + value.old_verdict + "</td>" ;
                table += "<td>" + value.verdict + "</td>" ;
                table += "<td>" + moment(value.created_at).format('llll') + "</td>" ;
                table += "</tr>";
            });


        table += "</tbody>";
        table += "</table>";
        return table;

    }
    function buildTableInfo_Mod_attributes(mod_attributes) {
        var table = "<table class='table table-bordered'>";
        table += "<thead><tr><th>Module Name</th><th>Attributes</th><th>Values</th></tr></thead>";
        table += "<tbody>";
        console.log(mod_attributes);
        _.each(mod_attributes, function (value, mod_name) {
            var length = _.keys(value).length
            var tr = "<tr>";
            tr += "<td  rowspan='" + length + "'>" + mod_name + "</td>";
            _.each(value, function (parameter_value, key) {
                if (tr == null) tr = "<tr>";
                tr += "<td>" + key + "</td>";
                if (key == 'created_at') {
                    tr += "<td>" + moment(parameter_value).format('llll') + "</td>";
                } else {
                    tr += "<td>" + parameter_value + "</td>";
                }
                tr += "</tr>";
                table += tr;
                tr = null;
            });
        });
        return table;
    }
    function buildTable_WeblogsWhoisRelated(mod_attributes,was_whois_related){
        if(isEmpty(mod_attributes) && was_whois_related == false) return null;
        var table = "<table class='table table-bordered'>";
        table += "<thead><tr><th>ID</th><th>Domain Name</th></tr></thead>";
        table += "<tbody>";
        console.log(mod_attributes);
        _.each(mod_attributes, function (domain, id) {
            var tr = "<tr>";
            tr += "<td>"+id+"</td>";
            tr += "<td>"+domain+"</td>";
            tr += "</tr>";
            table+=tr;
        });
        table += "</tbody>";
        table += "</table>";
        return table;

    }
    function getModulesChangesHistory(weblog_id){
        initModal("Modules Changes History of Weblog ID:" + weblog_id);
        var data = {weblog_id: weblog_id};
        $.ajax({
            type:"GET",
            data: data,
            dataType: "json",
            url: "/manati_project/manati_ui/analysis_session/weblog/modules_changes_attributes",
            success : function(json) {// handle a successful response
                var mod_attributes = JSON.parse(json['data']);
                var table = buildTableInfo_Mod_attributes(mod_attributes);
                updateBodyModal(table);
                // var info_report = JSON.parse(json['info_report']);
                // var query_node = json['query_node'];
                // var table = buildTableInfo_VT(info_report);
                // updateBodyModal(table);
            },
            error : function(xhr,errmsg,err) { // handle a non-successful response
                $.notify(xhr.status + ": " + xhr.responseText, "error");
                console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console

            }

        })

    }
    function getWeblogHistory(weblog_id){
        initModal("Weblog History ID:" + weblog_id);
        var data = {weblog_id: weblog_id};
        $.ajax({
            type:"GET",
            data: data,
            dataType: "json",
            url: "/manati_project/manati_ui/analysis_session/weblog/history",
            success : function(json) {// handle a successful response
                var weblog_history = JSON.parse(json['data']);
                var table = buildTableInfo_Wbl_History(weblog_history);
                updateBodyModal(table);
            },
            error : function(xhr,errmsg,err) { // handle a non-successful response
                $.notify(xhr.status + ": " + xhr.responseText, "error");
                console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            }

        })

    }
    function findDomainOfURL(url){
        var matching_domain = null;
        var domain = ( (matching_domain = url.match(REG_EXP_DOMAINS)) != null )|| matching_domain != undefined && matching_domain.length > 0 ? matching_domain[0] : null ;
        domain = (domain == null)  && ((matching_domain = url.match(REG_EXP_IP)) != null) || matching_domain != undefined && matching_domain.length > 0 ? matching_domain[0] : null;
        return domain
    }
    function contextMenuSettings (){
        //events for verdicts buttons on context popup menu
            $.contextMenu({
                selector: '.weblogs-datatable tr',
                events: {
                   show : function(options){
                        // // Add class to the menu
                        if(!this.hasClass('selected')){
                            this.addClass('selected');
                        }
                        this.addClass('menucontext-open');
                   },
                   hide : function(options) {
                       this.removeClass('menucontext-open');
                       this.removeClass('selected');
                       _bulk_marks_wbs = {};
                       _bulk_verdict = null;
                   }
                },
                build: function ($trigger, e){
                    return {
                        callback: function(key, options) {
                            var verdict = key;
                            var rows_affected = thiz.markVerdict(verdict);
                            _m.EventMultipleLabelingsByMenuContext(rows_affected,verdict);
                            return true;
                        },
                        items: generateContextMenuItems($trigger)

                    }
                }


            });
    }
    var setFileName = function(file_name){
        $("#weblogfile-name").html(file_name);
        _filename = file_name;
    };
    var getFileName = function (){
        return _filename;
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

            contextMenuSettings();
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
        });
    };


    /************************************************************
                            PUBLIC FUNCTIONS
     *************************************************************/
    //INITIAL function , like a contructor
    thiz.init = function(){
        reader_files = new ReaderFile(thiz);
        draw_viz = new DrawVisualization();
        on_ready_fn();

        // window.onbeforeunload = function() {
        //     return "Dude, are you sure you want to leave? Think of the kittens!";
        // }

    };
    thiz.eventBeforeParing = function(file){
        _size_file = file.size;
        _type_file = file.type;
        setFileName(file.name);
        showLoading();
        _m.EventFileUploadingStart(file.name,_size_file,_type_file);
        console.log("Parsing file...", file);
        $.notify("Parsing file...", "info");
        //$.notify(file.type,"info")

    };



    thiz.showJson = function(json){
        hideLoading();
        _m.EventFileUploadingFinished(_filename);
        draw_viz.showJSON(json);
    };

    thiz.parseData = function(file_rows){
        $("#jsontext").hide();


        var completeFn = function (results,file){
            if (results && results.errors)
            {
                if (results.errors)
                {
                    errorCount = results.errors.length;
                    firstError = results.errors[0];
                }
                if (results.data && results.data.length > 0){

                    console.log("Done with all files");
                    //INIT DATA
                    rowCount = results.data.length;
                    var data = results.data;
                    var headers = results.meta.fields;
                    $.each([COL_VERDICT_STR, COL_REG_STATUS_STR, COL_DT_ID_STR],function (i, value){
                        headers.push(value);
                    });

                    initData(data,headers);
                    hideLoading();
                    _m.EventFileUploadingFinished(_filename, rowCount);
                }

            }
        };
        Papa.parse(file_rows,
            {
                delimiter: "",
                header: true,
                complete: completeFn,
                worker: true,
                skipEmptyLines: true,
                error: function(err, file, inputElem, reason)
                {
                    console.log("ERROR Parsing:", err, file);
                    $.notify("ERROR Parsing:" + " " + err + " "+ file, "error");
                    _m.EventFileUploadingError(file.name);
                }
            }
        );
    };

    var initDataEdit = function (weblogs, analysis_session_id,headers_info) {
        _analysis_session_id = analysis_session_id;
        if(weblogs.length > 1){
            // sorting header
            var headers;
            if(_.isEmpty(headers_info)){
                var elem = weblogs[0];
                var attributes = JSON.parse(elem.fields.attributes);
                if(!(attributes instanceof Object)) attributes = JSON.parse(attributes);
                headers_info = _.keys(attributes);
                headers_info.push(COL_VERDICT_STR);
                headers_info.push(COL_REG_STATUS_STR);
                headers_info.push(COL_DT_ID_STR);
                thiz.setColumnsOrderFlat(true);
                headers = headers_info;
            }else{
                headers_info.sort(function(a,b) {
                    return a.order - b.order;
                });
                headers = $.map(headers_info,function(v,i){
                    return v.column_name
                });
            }
            //getting data
            var data = [];
            $.each(weblogs, function (index, elem){
                var id = elem.pk;
                var attributes = JSON.parse(elem.fields.attributes);
                if(!(attributes instanceof Object)) attributes = JSON.parse(attributes);
                attributes[COL_VERDICT_STR] = elem.fields.verdict.toString();
                attributes[COL_REG_STATUS_STR] = elem.fields.register_status.toString();
                attributes[COL_DT_ID_STR] = id.toString();
                var sorted_attributes = {};
                _.each(headers, function(value, index){
                    sorted_attributes[value] = attributes[value];
                });
                data.push(sorted_attributes);
            });

            initData(data, headers );
            //hide or show column
            $.each(headers_info,function(index,elem){
                _dt.columns(index).visible(elem.visible).draw()
            });

            $(document).ready(function(){
                $('#panel-datatable').show();
                setInterval(syncDB, TIME_SYNC_DB );

            });
        }else{
            hideLoading();
            $.notify("The current AnalysisSession does not have weblogs saved", "info", {autoHideDelay: 5000 });
        }


    };

    this.callingEditingData = function (analysis_session_id){
        var data = {'analysis_session_id':analysis_session_id};
        $.notify("The page is being loaded, maybe it will take time", "info", {autoHideDelay: 3000 });
        showLoading();
        _m.EventLoadingEditingStart(analysis_session_id);
        $.ajax({
                type:"GET",
                data: data,
                dataType: "json",
                url: "/manati_project/manati_ui/analysis_session/get_weblogs",
                success : function(json) {// handle a successful response
                    var weblogs = JSON.parse(json['weblogs']);
                    var analysis_session_id = json['analysissessionid'];
                    var file_name = json['name'];
                    var headers = JSON.parse(json['headers']);
                    setFileName(file_name);

                    initDataEdit(weblogs, analysis_session_id,headers);
                    _m.EventLoadingEditingFinished(analysis_session_id, weblogs.length)
                },

                error : function(xhr,errmsg,err) { // handle a non-successful response
                    $.notify(xhr.status + ": " + xhr.responseText, "error");
                    console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    _m.EventLoadingEditingError(analysis_session_id);

                }
            });

    };

    var setBulkVerdict_WORKER = function (verdict, flows_labelled){
        _dt.rows('.selected').nodes().to$().removeClass('selected');
        showLoading();
         var blob = new Blob([ "onmessage = function(e) { " +
            "var verdict = e.data[1];"+
            "var rows_data = e.data[2];"+
            "var col_dt_id = e.data[3];"+
            "var col_verdict = e.data[4];"+
            "var origin = e.data[5];"+
            "var col_reg_status = e.data[6];"+
            "var reg_status = e.data[7];"+
            "self.importScripts(origin+'/static/manati_ui/js/libs/underscore-min.js');"+
            "var flows_labelled = _.map(e.data[0],function(v,i){ return v.dt_id});"+
            "for(var i = 0; i< rows_data.length; i++) {"+
                "var row_dt_id = rows_data[i][col_dt_id]; "+
                "var index = flows_labelled.indexOf(row_dt_id); "+
                "if(index >=0){"+
                   "rows_data[i][col_verdict] = verdict ;"+
                   "rows_data[i][col_reg_status] = reg_status.modified ;"+
                "}"+
             "};" +
             "self.postMessage(rows_data)"+
        "}"]);
        var blobURL = window.URL.createObjectURL(blob);
        var worker = new Worker(blobURL);
        worker.addEventListener('message', function(e) {
            var rows_data = e.data;
            var current_page = _dt.page.info().page;
            _dt.clear().rows.add(rows_data).draw();
            _dt.page(current_page).draw('page');
            hideLoading();
	    });
        var rows_data = _dt.rows().data().toArray();
        worker.postMessage([flows_labelled,verdict,rows_data,
            COLUMN_DT_ID, COLUMN_VERDICT,document.location.origin, COLUMN_REG_STATUS, REG_STATUS]);
    };

    var processingFlows_WORKER = function (flows) {
         $("#statical-section").html('');
        _flows_grouped = {};
        var blob = new Blob([ "onmessage = function(e) { " +
            "var flows = e.data[1];"+
            "var flows_grouped = e.data[0];"+
            "var origin = e.data[2];"+
            "self.importScripts(origin+'/static/manati_ui/js/libs/underscore-min.js');"+
            "self.importScripts(origin+'/static/manati_ui/js/struct_helper.js');"+
            "var helper = new FlowsProcessed(flows_grouped);"+
            "for(var i = 0; i< flows.length; i++) helper.addFlows(flows[i]);"+
            "self.postMessage(helper.getFlowsGrouped());" +
        "}"]);

        // Obtain a blob URL reference to our worker 'file'.
        var blobURL = window.URL.createObjectURL(blob);

        var worker = new Worker(blobURL);
        worker.addEventListener('message', function(e) {
            worker.terminate();
            _flows_grouped = e.data;
            _helper = new FlowsProcessed(_flows_grouped);
            _helper.makeStaticalSection();
            console.log("Worker Done");
	    });
        worker.postMessage([_flows_grouped,flows,document.location.origin]);

    };

    var copyTextToClipboard = function(text) {
      var textArea = document.createElement("textarea");

      //
      // *** This styling is an extra step which is likely not required. ***
      //
      // Why is it here? To ensure:
      // 1. the element is able to have focus and selection.
      // 2. if element was to flash render it has minimal visual impact.
      // 3. less flakyness with selection and copying which **might** occur if
      //    the textarea element is not visible.
      //
      // The likelihood is the element won't even render, not even a flash,
      // so some of these are just precautions. However in IE the element
      // is visible whilst the popup box asking the user for permission for
      // the web page to copy to the clipboard.
      //

      // Place in top-left corner of screen regardless of scroll position.
      textArea.style.position = 'fixed';
      textArea.style.top = 0;
      textArea.style.left = 0;

      // Ensure it has a small width and height. Setting to 1px / 1em
      // doesn't work as this gives a negative w/h on some browsers.
      textArea.style.width = '2em';
      textArea.style.height = '2em';

      // We don't need padding, reducing the size if it does flash render.
      textArea.style.padding = 0;

      // Clean up any borders.
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';

      // Avoid flash of white box if rendered for any reason.
      textArea.style.background = 'transparent';


      textArea.value = text;

      document.body.appendChild(textArea);

      textArea.select();

      try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Copying text command was ' + msg);
      } catch (err) {
        console.log('Oops, unable to copy');
      }

      document.body.removeChild(textArea);
    }






}
