var _selectedIP;
var _selectedDate;
var _selectedHour;
var _jsonprofile;
var _hoursarray;
var _datatable;
var _datatables = {};
/**
 * Created by david on 5.6.17.
 */

function DrawVisualization() {

    if(typeof google !== 'undefined') {
        google.charts.load('current', {'packages': ['geochart', 'corechart', 'table', 'bar']});
        google.charts.setOnLoadCallback(redrawVisualization());
    }
    function regioMap() {
        $(window).on('drawmap', function (e) {
            console.log('Google charts loaded'/*, e.countriesDict*/);
            //drawRegioMap()
            //Concurrent.Thread.create(drawRegioMap);
        });
    }




    function redrawVisualization() {
        //if(_selectedIP) {
    /*    if (typeof _selectedIP !== 'undefined') {
            drawSumaryTable();
            drawRegioMap();
            $('#histograms_div').empty();
            drawPortFeatures();
            drawTable('clientDestinationPortDictIPsTCP');
            drawTable('clientDestinationPortDictIPsUDP');


        }*/
    };
    function drawPortFeatures() {
        var s = ['client', 'server'];
        var d = ['SourcePort', 'DestinationPort'];
        var f = ['TotalBytes', 'TotalPackets', 'NumberOfFlows'];
        var p = ['TCP', 'UDP'];
        var si, di, fi, pi;
        var name;
        for (si = 0; si < s.length; ++si) {
            for (di = 0; di < d.length; ++di) {
                for (pi = 0; pi < p.length; ++pi) {
                    for (fi = 0; fi < f.length; ++fi) {
                        name = s[si] + d[di] + f[fi] + p[pi];
                        drawHistogram(name);
                    }
                }
            }
        }

    }

    function showCurrentJson() {
        visualizeJSONtoHTML(_jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour]);
    }


    $("a[href='#sumary_tab']").on('shown.bs.tab', function (e) {
        var target = $(e.target).attr("href"); // activated tab
        //alert(target);
        if (typeof _selectedIP !== 'undefined') {
            drawSumaryTable();
        }
    });
    $("a[href='#regions_tab']").on('shown.bs.tab', function (e) {
        if (typeof _selectedIP !== 'undefined') {
            drawRegioMap('clientDictNumberOfDistinctCountries');
            drawRegioMap('serverDictNumberOfDistinctCountries');

        }
    });

    $("a[href='#donutchart_tab']").on('shown.bs.tab', function (e) {
        if (typeof _selectedIP !== 'undefined') {
            drawDonutChart('clientDictClassBnetworks');
            drawDonutChart('serverDictClassBnetworks');

        }
    });
    $("a[href='#histograms_tab']").on('shown.bs.tab', function (e) {
        if (typeof _selectedIP !== 'undefined') {
            $('#histograms_div').empty();
            drawPortFeatures();
        }
    });
    $("a[href='#tables_tab']").on('shown.bs.tab', function (e) {
        if (typeof _selectedIP !== 'undefined') {
            drawTable('clientDestinationPortDictIPsTCP');
            drawTable('clientDestinationPortDictIPsUDP');
            drawTable('serverSourcePortDictIPsTCP');
            drawTable('serverSourcePortDictIPsUDP');
        }
    });
    $("a[href='#json_tab']").on('shown.bs.tab', function (e) {
        /*if ($(this).hasClass("active")) {
            return false;
        }*/
        if (typeof _selectedIP !== 'undefined') {
            showCurrentJson();
        }
    });
    $("a[href='#notanweredconnections_tab']").on('shown.bs.tab', function (e) {
        drawDataTable('clientDictOfNonAnsweredConnections');
        drawDataTable('serverDictOfNonAnsweredConnections');
    });
    $("a[href='#testing_tab']").on('shown.bs.tab', function (e) {
        newJsonStyle();
    });

    $('#logcheckbox').change(function() {
        refreshTab();
    });
    function newJsonStyle() {
        var margin = {top: 30, right: 20, bottom: 30, left: 20},
            width = 960 - margin.left - margin.right,
            barHeight = 20,
            barWidth = width * .8;

        var i = 0,
            duration = 400,
            root;

        var tree = d3.layout.tree()
            .nodeSize([0, 20]);

        var diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

        var svg = d3.select("#testing_tab").append("svg")
            .attr("width", width + margin.left + margin.right)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        d3.json("result.json", function(error, flare) {
          if (error) throw error;

          flare.x0 = 0;
          flare.y0 = 0;
          update(root = flare);
        });
       /* _jsonprofile.x0 = 0;
        _jsonprofile.y0 = 0;

        update(root = _jsonprofile);*/

        function update(source) {

                  // Compute the flattened node list. TODO use d3.layout.hierarchy.
                  var nodes = tree.nodes(root);

                  var height = Math.max(500, nodes.length * barHeight + margin.top + margin.bottom);

                  d3.select("svg").transition()
                      .duration(duration)
                      .attr("height", height);

                  d3.select(self.frameElement).transition()
                      .duration(duration)
                      .style("height", height + "px");

                  // Compute the "layout".
                  nodes.forEach(function(n, i) {
                    n.x = i * barHeight;
                  });

                  // Update the nodes…
                  var node = svg.selectAll("g.node")
                      .data(nodes, function(d) { return d.id || (d.id = ++i); });

                  var nodeEnter = node.enter().append("g")
                      .attr("class", "node")
                      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                      .style("opacity", 1e-6);

                  // Enter any new nodes at the parent's previous position.
                  nodeEnter.append("rect")
                      .attr("y", -barHeight / 2)
                      .attr("height", barHeight)
                      .attr("width", barWidth)
                      .style("fill", color)
                      .on("click", click);

                  nodeEnter.append("text")
                      .attr("dy", 3.5)
                      .attr("dx", 5.5)
                      .text(function(d) { return d.name; });

                  // Transition nodes to their new position.
                  nodeEnter.transition()
                      .duration(duration)
                      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
                      .style("opacity", 1);

                  node.transition()
                      .duration(duration)
                      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
                      .style("opacity", 1)
                    .select("rect")
                      .style("fill", color);

                  // Transition exiting nodes to the parent's new position.
                  node.exit().transition()
                      .duration(duration)
                      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                      .style("opacity", 1e-6)
                      .remove();

                  // Update the links…
                  var link = svg.selectAll("path.link")
                      .data(tree.links(nodes), function(d) { return d.target.id; });

                  // Enter any new links at the parent's previous position.
                  link.enter().insert("path", "g")
                      .attr("class", "link")
                      .attr("d", function(d) {
                        var o = {x: source.x0, y: source.y0};
                        return diagonal({source: o, target: o});
                      })
                    .transition()
                      .duration(duration)
                      .attr("d", diagonal);

                  // Transition links to their new position.
                  link.transition()
                      .duration(duration)
                      .attr("d", diagonal);

                  // Transition exiting nodes to the parent's new position.
                  link.exit().transition()
                      .duration(duration)
                      .attr("d", function(d) {
                        var o = {x: source.x, y: source.y};
                        return diagonal({source: o, target: o});
                      })
                      .remove();

                  // Stash the old positions for transition.
                  nodes.forEach(function(d) {
                    d.x0 = d.x;
                    d.y0 = d.y;
                  });
                }
                // Toggle children on click.
                function click(d) {
                  if (d.children) {
                    d._children = d.children;
                    d.children = null;
                  } else {
                    d.children = d._children;
                    d._children = null;
                  }
                  update(d);
                }
                function color(d) {
                  return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
                }
    }
    function generateIPLayerOfButtons()
    {
        $(".btn-groupIPS").empty();
        $(".btn-groupIPS").show();
        $("#dayprofilecolapse").hide();


        $.each(_jsonprofile, function (k, v) {
            //display the key and value pair
            //alert(k + ' is ' + v);
            var $something = $('<input/>').attr({class: "btn btn-default ipbuttons", type: 'button', name: 'btn1', value: k});
            $(".btn-groupIPS").append($something);
        });
        $(".btn-groupIPS .btn").on("click", function (e) {
            _selectedIP = $(this).val();
            e.preventDefault();
            //$(this).removeClass('btn btn-default');
            $(this).addClass('btn-primary').siblings().removeClass('btn-primary');
            //$("#ipsumarytext").show();
            generateDayLayerOfButtons();
            //redrawVisualization();
            //drawRegioMap()
            //alert("Value is " + n);
        });
    }
    function generateDayLayerOfButtons() {
        $(".btn-groupDays").empty();
        $(".btn-groupDays").show();
        //btn-groupDays
        var days = [];
        $.each(_jsonprofile[_selectedIP]["time"], function (k, v) {
            days.push(k);
            //var $something= $('<input/>').attr({ class: "btn btn-default",type: 'button', name:'btn1', value:k});
            //$(".btn-groupHours").append($something);
        });
        days.sort();
        for (var i = 0; i < days.length; i++) {
            var $something2 = $('<input/>').attr({
                class: "btn btn-default daybuttons",
                type: 'button',
                name: 'btn2',
                value: days[i]
            });
            if(_selectedDate == days[i])
            {
                $something2.addClass('btn-info');
            }
            $(".btn-groupDays").append($something2);
        }
        if(typeof _selectedHour !== 'undefined')
        {
            if (Object.keys(_jsonprofile[_selectedIP]["time"][_selectedDate]).length > 1) {
                var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour]["hoursummary"];
                for (var feature in dict) {
                    drawDailyGraph(feature);
                }
                $("#dayprofilecolapse").show();
            }
            generateHourLayerOfButtons();
        }
        $(".btn-groupDays .btn").on("click", function (e) {
            _selectedDate = $(this).val();
            e.preventDefault();
            $(this).addClass('btn-info').siblings().removeClass('btn-info');
            if (Object.keys(_jsonprofile[_selectedIP]["time"][_selectedDate]).length > 1) {
                var dict = _jsonprofile[_selectedIP]["time"][_selectedDate];
                var randomhour;
                for (var hour in dict) {
                    randomhour = hour;
                    break;
                }
                var dict_2 = _jsonprofile[_selectedIP]["time"][_selectedDate][randomhour]["hoursummary"];
                for (var feature in dict_2) {
                    drawDailyGraph(feature);
                }
                $("#dayprofilecolapse").show();
            }
            generateHourLayerOfButtons();
        });
    }
    function generateHourLayerOfButtons() {
        var hours = [];
        $(".btn-groupHours").empty();
        $(".btn-groupHours").show();

        $.each(_jsonprofile[_selectedIP]["time"][_selectedDate], function (k, v) {
            hours.push(k);
            //var $something= $('<input/>').attr({ class: "btn btn-default",type: 'button', name:'btn1', value:k});
            //$(".btn-groupHours").append($something);
        });
        hours.sort();
        for (var i = 0; i < hours.length; i++) {
            var $something = $('<input/>').attr({
                class: "btn btn-default hourbuttons",
                type: 'button',
                name: 'btn3',
                value: hours[i]
            });
            if(_selectedHour == hours[i])
            {
                $something.addClass('btn-success');
                refreshTab();
            }
            $(".btn-groupHours").append($something);
        }
        $("#backbutton").show();
        $("#forwardbutton").show();
        $(".btn-groupHours .btn").on("click", function (e) {
            _selectedHour = $(this).val();
            e.preventDefault();
            $(this).addClass('btn-success').siblings().removeClass('btn-success');
            refreshTab();


        });
    }
    function refreshTab()
    {
        $("#featurestabs").css('visibility', 'visible');
        var $link = $('li.active a[data-toggle="tab"]');
        $link.parent().removeClass('active');
        var tabLink = $link.attr('href');
        $('#featurestabs a[href="' + tabLink + '"]').tab('show');
        $(".tab-content").css('visibility', 'visible');

    }
    this.clearVisualization = function () {
        $("#viztext").hide();
        $(".btn-groupIPS").empty();
        $(".btn-groupDays").empty();
        $(".btn-groupHours").empty();
        $("#backbutton").hide();
        $("#forwardbutton").hide();
        $("#dayprofilecolapse").hide();
        $("#featurestabs .tab").empty();
        $(".tab-content").css('visibility', 'hidden');
        $("#featurestabs").css('visibility', 'hidden');

        //TODO refing using of undefined https://stackoverflow.com/questions/2235622/can-i-set-variables-to-undefined-or-pass-undefined-as-an-argument
        _selectedIP = undefined;
        _selectedHour = undefined;
        _selectedDate = undefined;
    };
    this.showJSON = function (json) {
        _jsonprofile = json;
       // $("#save-profile").show(); // not sure if it is a bad practice to rely that this does not work when the element is not present
        $("#save-profile").on("click", function () {
            var data = {
                'profile': _jsonprofile,
                'filename' : 'bambule'
            };
            try {
                $.ajax({
                    type: "POST",
                    data: JSON.stringify(data),
                    dataType: "json",
                    url: "/manati_project/manati_ui/analysis_session/save_profile",
                    // handle a successful response
                    success: function (json) {
                        $.notify("Profile saved successfully", "info"/*, {autoHideDelay: 5000 }*/);
                        $("#save-profile").hide();
                    },

                    // handle a non-successful response
                    error: function (xhr, errmsg, err) {
                        $('#results').html("<div class='alert-box alert radius' data-alert>Oops! We have encountered an error: " + errmsg +
                            " <a href='#' class='close'>&times;</a></div>"); // add the error to the dom
                        console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                        $.notify(xhr.status + ": " + xhr.responseText, "error");
                        //NOTIFY A ERROR
                        _m.EventAnalysisSessionSavingError(_filename);
                    }
                });
            } catch (e) {
                $.notify(e, "error");
            }
        });
    /*$(document).ready(function() {
        alert("Ready sir")
    });*/
    //function showJSON(json) {
        generateIPLayerOfButtons();

        $("#viztext").show();
        //console.log(json);

        //var evt = $.Event('drawmap');
        //var countriesDict = json['147.32.80.9']['hours']['2016/10/05 00']['clientDictOfDistinctCountries'];
        //evt.countriesDict = countriesDict;
        var num = null;
        $("#backbutton").on("click", function () {
            var prevbutton = $(".btn-groupHours .btn[value='" + _selectedHour + "']").prev();//.value( "Hot Fuzz" );
            if (typeof prevbutton !== 'undefined') {
                prevbutton.click();
            }
        });
        $("#forwardbutton").on("click", function () {
            var prevbutton = $(".btn-groupHours .btn[value='" + _selectedHour + "']").next();//.value( "Hot Fuzz" );
            if (typeof prevbutton !== 'undefined') {
                prevbutton.click();
            }
        });
        /*$("#show-raw-json").on("click", function () {
            if (typeof _selectedIP !== 'undefined') {
                showCurrentJson();
            }
        });*/
        // $(window).trigger(evt);
        $(window).smartresize(function () {
            var $link = $('li.active a[data-toggle="tab"]');
            $link.parent().removeClass('active');
            var tabLink = $link.attr('href');
            $('#featurestabs a[href="' + tabLink + '"]').tab('show');
        });
    };

    function drawTable(name) {
        var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][name];
        if ($('#table_div' + ' .' + name).length == 0) {
            var $tcp = $('<div/>').attr({class: name, type: 'div'});
            //var $tcp = $('<table/>').attr({class: name + " display table table-striped table-bordered table-hover td-limit", type: 'table'});
            //$tcp.attr('style','width: 650px');
            //$tcp.style("width","650px");
            $('#table_div').append($tcp);
            $("<h4>" + (name) + ":</h4>").insertBefore('#table_div' + ' .' + name);
        }
       /* $('#table_div' + ' .' + name).css("width","60px");

       var data = [];
        for (var port in dict) {
            data.push([port,Object.keys(dict[port]).length,Object.keys(dict[port]).join(', ')]);
        }
       if(_datatables[name] != null || _datatables[name] != undefined) {
            _datatables[name].clear().draw();
            _datatables[name].rows.add(data); // Add new data
            _datatables[name].columns.adjust().draw(); // Redraw the DataTable
       }
        else {
            _datatables[name] = $('#table_div' + ' .' + name).DataTable({
                data: data,
                scrollX: true,
                columns: [
                    {title: "Port"},
                    {title: "Total Number"},
                    {title: "IPs"},

                ],
                autoWidth: false, //step 1
               columnDefs: [
                  { width: '10px', targets: 0 }, //step 2, column 1 out of 4
                  { width: '10px', targets: 1 }, //step 2, column 2 out of 4
               ]
                //fixedColumns: true
            });
        }
*/

        var small = [
            ['Port','Total Number', 'IPs'],
        ];
       for (var port in dict) {
            small.push([port,Object.keys(dict[port]).length,Object.keys(dict[port]).join(', ')]);
        }
        var data = google.visualization.arrayToDataTable(small);

        var options = {
            page: true,
            pageSize: 10,
        };
        var parent = document.getElementById("table_div");
        var child = parent.getElementsByClassName(name)[0];

        var table = new google.visualization.Table(child);
        table.draw(data, options);

    }
    function drawDailyGraph(name)
    {
        var dict = _jsonprofile[_selectedIP]["time"][_selectedDate];//[_selectedHour][name];
        var dictofonefeature = {};
        if ($('#day_graphs_div' + ' .' + name).length == 0) {
            var $tcp = $('<div/>').attr({class: name, type: 'div'});
            $('#day_graphs_div').append($tcp);
            $("<h4>" + (name) + ":</h4>").insertBefore('#day_graphs_div' + ' .' + name);
        }
        var dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'hour');
        dataTable.addColumn('number', 'value');
        for (var hour in dict){
            dataTable.addRow([hour, dict[hour]["hoursummary"][name]]);
        }
        var parent = document.getElementById("day_graphs_div");
        var child = parent.getElementsByClassName(name)[0];
        var options = {
                        title: name,
                        // legend: {position: 'top', maxLines: 2},
                        legend: 'none',
                        vAxis: {format: 'decimal'},
                    };
        //child.style.display = 'block';
        $("#demo").addClass("in");
        var chart = new google.visualization.LineChart(child);
        google.visualization.events.addListener(chart, 'ready', function () {
            //child.style.display = 'none';
            $("#demo").removeClass("in");

        });
        chart.draw(dataTable, google.charts.Bar.convertOptions(options));
    }
    function drawDataTable(name){
        var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][name];
        if ($('#notanweredconnections_div' + ' .' + name).length == 0) {
            var $tcp = $('<table/>').attr({class: name + " display table table-striped table-bordered table-hover", type: 'table'});
            $('#notanweredconnections_div').append($tcp);
            $("<h4>" + (name) + ":</h4>").insertBefore('#notanweredconnections_div' + ' .' + name);
        }

        var data = [];
        for (var x in dict) {
            data.push([x, dict[x]]);
        }
       if(_datatables[name] != null || _datatables[name] != undefined) {
            _datatables[name].clear().draw();
            _datatables[name].rows.add(data); // Add new data
            _datatables[name].columns.adjust().draw(); // Redraw the DataTable
       }
        else {
            _datatables[name] = $('#notanweredconnections_div' + ' .' + name).DataTable({
                data: data,
                //scrollX: true,
                columns: [
                    {title: "Attempted connection"},
                    {title: "Number of tries"},
                    ],
            });
        }

    }
    function drawSumaryTable() {
        var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour]["hoursummary"];
        if (!$('#sumary_table').is()) {
            var $tcp = $('<table/>').attr({class: "display table table-striped table-bordered table-hover", type: 'table'});
            $('#sumary_tab').append($tcp);
        }
        var array = [];
        for (var feature in dict) {
            array.push([feature, dict[feature]]);
        }
        if(_datatables["hoursummary"] != null || _datatables["hoursummary"] != undefined) {
                _datatables["hoursummary"].clear().draw();
                _datatables["hoursummary"].rows.add(array); // Add new data
                _datatables["hoursummary"].columns.adjust().draw(); // Redraw the DataTable
            }
        else {
            _datatables["hoursummary"] = $('#sumary_table').DataTable({
                data: array,
                columns: [
                    {title: "Feature"},
                    {title: "Value"},
                ]
            });
        }

        /*var data = google.visualization.arrayToDataTable(array);
        var options = {};
        var div = document.getElementById("sumary_table");
        var table = new google.visualization.Table(div);
        table.draw(data, options);*/

    }



    function drawHistogram(nameofdict) {
        var uselogscale;
        if ($('#logcheckbox').is(":checked"))
        {
            uselogscale = 'mirrorLog';
        }
        else {
            uselogscale = 'null';
        }
        var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][nameofdict];
        if ($('#histograms_div' + ' .' + nameofdict).length == 0) {
            var $histdiv = $('<div/>').attr({class: nameofdict, type: 'div' ,value: 0});
            $('#histograms_div').append($histdiv);

        }
        var num = [
            ['Port', 'Count'],
        ];
        var small = [
            ['Port', 'Count'],
        ];
        var binsdict = {};
        for (var bin = 0; bin < 65536 / 1024; bin++) {
            var stringid = (bin * 1024).toString() + " - " + ((bin * 1024) + 1024).toString();
            binsdict[stringid] = 0;
        }
        var arr = Object.keys(dict).map(function (key) {
            return dict[key];
        });
        var max = Math.max.apply(null, arr);

        for (var port in dict) {
            var intport = Number(port);
            var binid = Math.floor(intport / 1024);
            var stringid = (binid * 1024).toString() + " - " + ((binid * 1024) + 1024).toString();
            if (stringid in binsdict) {
                binsdict[stringid] += dict[port];
            }
            else {
                binsdict[stringid] = dict[port];
            }
        }
        var arr = Object.keys(binsdict).map(function (key) {
            return binsdict[key];
        });
        var maxim = Math.max.apply(null, arr);
        for (var bin in binsdict) {
            num.push([bin, binsdict[bin] / maxim]);
        }
        for (var port in dict) {
            small.push([port, dict[port]]);
        }
        var dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'port');
        dataTable.addColumn('number', 'count');
        dataTable.addColumn({type: 'string', role: 'tooltip'});

        for (var bin in binsdict) {
            dataTable.addRow([bin, binsdict[bin] / maxim, "Bin: " + bin + "\nReal number: " + binsdict[bin]]);
        }

        //var data = google.visualization.arrayToDataTable(num);

        var datasmall = google.visualization.arrayToDataTable(small);
        var options = {
            title: nameofdict + "\nNormalised with value: " + maxim.toString(),
            // legend: {position: 'none'},
            //orientation: 'vertical',
            //hAxis: { title: 'ports' },
            //chartArea:{left:20,top:0,width:'85%',height:'100%'},
            // legend: { position: 'top', maxLines: 2 },
            legend: 'none',
            // tooltip: {textStyle: {color: '#03f8ff'}, showColorCode: true},

            vAxis: {format: 'decimal', scaleType: uselogscale},
            minValue: 0,
            maxValue: 65536,
        };


        //console.log($('#histograms_div' + ' .' + nameofdict).length);
        var parent = document.getElementById("histograms_div");
        var child = parent.getElementsByClassName(nameofdict)[0];
        if (Object.keys(dict).length >= 1) {
            //var chart = new google.visualization.Histogram(child);

            // var chart = new google.charts.Bar(child);
            // chart.draw(dataTable, google.charts.Bar.convertOptions(options));

            var chart = new google.visualization.ColumnChart(child);
            chart.draw(dataTable, options);
            var current = 0;
            google.visualization.events.addListener(chart, 'select', function () {
                current = 1 - current;
                if (current == 1) {
                    // alert(current);
                    var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][nameofdict];
                    var abc = chart.getSelection();

                    var rowid = abc[0].row;
                    var dataTable = new google.visualization.DataTable();
                    dataTable.addColumn('string', 'port');
                    dataTable.addColumn('number', 'count');
                    //dataTable.addColumn({type: 'number', role: 'annotation'});
                    dataTable.addColumn({type: 'string', role: 'tooltip'});
                    var maxim = 0;
                    for (port = rowid * 1024; port < (rowid * 1024) + 1024; port++) {
                        if (maxim < dict[port]) maxim = dict[port];
                    }

                    for (port = rowid * 1024; port < (rowid * 1024) + 1024; port++) {
                        if (port in dict) {
                            dataTable.addRow([port.toString(), dict[port] / maxim, "Port: " + port.toString() + "\nReal number: " + dict[port]]);
                        }
                    }
                    var options = {
                        title: nameofdict + "\nNormalised with value: " + maxim,
                        // legend: {position: 'top', maxLines: 2},
                        legend: 'none',
                        vAxis: {format: 'decimal', scaleType: uselogscale},
                        minValue: 0,
                        maxValue: 65536,
                        //annotations: {alwaysOutside: true}
                    };
                    chart.draw(dataTable, google.charts.Bar.convertOptions(options));
                }
                else {
                    drawHistogram(nameofdict);
                }
            });

        }
        else if (Object.keys(dict).length < 1) {
            $('#histograms_div' + ' .' + nameofdict).append("<p>" + nameofdict + ": No data availble</p>");
        }
        else {
            $("<h4>" + nameofdict + ":</h4>").insertBefore('#histograms_div' + ' .' + nameofdict);
            var chart = new google.visualization.Table(child);
            chart.draw(datasmall, options);

        }

    }

    function drawNumberOfFlowsComparison() {
       var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][nameofdict];
    }
    function drawDonutChart(nameofdict)
    {
        var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][nameofdict];
        if ($('#donutchart_div' + ' .' + nameofdict).length == 0) {
                var div = $('<div/>').attr({class: nameofdict+ " donutchart", type: 'div'});
                //$('#regions_div').append("<h4>" + nameofdict + ":</h4>");
                $('#donutchart_div').append(div);
        }
        var dataTable = new google.visualization.DataTable();
            dataTable.addColumn('string', 'ClassB IP');
            dataTable.addColumn('number', 'Number of flows to the ClassB network');
            //dataTable.addColumn({type: 'string', role: 'tooltip'});

        for (var classB in dict) {
                dataTable.addRow([classB, dict[classB]]);
        }
        var options = {
          title: nameofdict,
          //is3D: true,
          pieHole: 0.4,
        };

        var parent = document.getElementById("donutchart_div");
        var child = parent.getElementsByClassName(nameofdict)[0];
        var chart = new google.visualization.PieChart(child/*document.getElementById('regions_div')*/);
        chart.draw(dataTable, options);
    }
    function drawRegioMap(name) {

        var countriesDict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][name];
        if (Object.keys(countriesDict).length > 0) {
            if ($('#regions_div' + ' .' + name).length == 0) {
                var regiodiv = $('<div/>').attr({class: name, type: 'div'});
                $('#regions_div').append("<h4>" + name + ":</h4>");
                $('#regions_div').append(regiodiv);
            }


            var dataTable = new google.visualization.DataTable();
            dataTable.addColumn('string', 'Country');
            dataTable.addColumn('number', 'Number of flows');
            dataTable.addColumn({type: 'string', role: 'tooltip'});


            /* var count = [
             ['Country', 'Number of flows logartihm scale']
             ];*/
            for (var country in countriesDict) {
                //count.push([country, Math.log(countriesDict[country]) / Math.log(10)]);
                dataTable.addRow([country, Math.log(countriesDict[country]) / Math.log(10), "Number of client flows to this country: " + countriesDict[country].toString()]);
            }
            //count.push(['Czech Republic', 12]);
            //var data = google.visualization.arrayToDataTable(count);

            var options = {
                legend: 'none'
            };
            var parent = document.getElementById("regions_div");
            var child = parent.getElementsByClassName(name)[0];
            var chart = new google.visualization.GeoChart(child/*document.getElementById('regions_div')*/);

            chart.draw(dataTable, options);
        }
        else {
            if($('#regions_div' + ' .' + name).length == 0) {
                var regiodiv = $('<div/>').attr({class: name, type: 'div'});
                $('#regions_div').append("<h4> No data avaible </h4>");
            }
        }

        /*       var chart = new google.visualization.ChartWrapper({
         chartType: 'GeoChart',
         containerId: 'regions_div',
         dataTable: data,
         options: {
         // width: 600,
         legend: 'none' // hide the legend since the values will not be accurate
         },
         view: {
         columns: [0, {
         // log scale the data
         type: 'number',
         label: 'Value',
         calc: function (dt, row) {
         // find the base-10 log of the value
         var log = Math.log(dt.getValue(row, 1)) / Math.log(10);
         return {v: log, f: dt.getFormattedValue(row, 1)};
         }
         }]
         }
         });
         chart.draw();
         */
    };
}