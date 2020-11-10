import React, {useRef, useState, useEffect} from 'react';
import * as d3 from 'd3';
import usePrevious from './usePrevious';
import { zoomTransform } from 'd3';
import { Button, Slider } from '@material-ui/core';


function LinechartMultiple(props) {

    const svgRef = useRef();
    const svgRefyAxis = useRef();
    const svgReflegend = useRef();
    const svgbrushChart = useRef();

    // color for different models
    var color = ["blue", "pink", "red", "yellow", "green", "orange", "purple", "black", "black", "black", "black", "black", "black", "black"];

    // passed properties
    var selectedStation = props.selectedStation;
    var selectedModels = props.selectedModels; 
    var selectedYear = props.selectedYear;    // [1979, 2019];
    var selectedStationData = props.selectedStationData; //[station0: [pred,actual, staid], station1: [pred, actual, staid]]
    var displayModel = props.displayModel;
    var prediction; 
    var groundTruth; 
    var gtylist;

    // check for undefined data
    if (selectedStationData.length > 0){
        // filter based on year and model
        prediction = selectedStationData.map(x => x[0]);
        groundTruth = selectedStationData.map(x => x[1]);

        prediction = prediction.map(osd => osd.filter(x => selectedModels.includes(x.model)));
        prediction = prediction.map(osd => osd.filter(x => x.date.getFullYear() >= selectedYear[0] && x.date.getFullYear() <= selectedYear[1]));
        groundTruth = groundTruth.map(osd => osd.filter(x => x.date.getFullYear() >= selectedYear[0] && x.date.getFullYear() <= selectedYear[1]));

        // for finding all years
        gtylist = groundTruth.map(osd => osd.map(d => d.date)).flat();
        gtylist = [...new Set([...gtylist])];
    }

    // prediction empty, put some dummy data
    if (typeof prediction !== 'undefined' && prediction.length === 0 && typeof groundTruth !== 'undefined' && groundTruth.length > 0){
        prediction = [[{"date": groundTruth[0].date, "model": "A", "yhat": 0}]];  //[{date: new Date(2018, 1, 1), model: "Model A", yhat: 0}]
    }

    // constants for svg properties
    const height = 400;
    const width = 1000;
    const padding = 40;
    var formatTime = d3.timeFormat("%b %Y");

    // interactivity in chart
    const [selection, setSelection] = useState([0,width]); // use for brushchart
    const previousSelection = usePrevious(selection); // use for brushchart
    const [currentZoomState, setCurrentZoomState] = useState(); // used for zoom
    var zoomBehavior;  // used for zoom

    const [firstRender, setFirstRender] = useState(true);

    const [selectedYearView, setSelectedYearView] = useState(selectedYear[0]);

    const brush = d3.brushX().extent([
                [0,0], [width, height/3]
    ])



    useEffect(() => {
        // ...D3 code
        const svg = d3.select(svgRef.current); 
        const svgyaxis = d3.select(svgRefyAxis.current); 
        const svglegend = d3.select(svgReflegend.current);

        // remove all predline from previous draws
        for (var i = 0; i< 100; i++){
            svg.selectAll("#predline"+i).remove();
        }

        // remove all gtline from previous draws
        for (var i = 0; i< 100; i++){
            svg.selectAll("#gtline"+i).remove();
        }
        

        if (selectedStation.length > 0){  //){ //typeof prediction !== 'undefined' && typeof groundTruth !== 'undefined'
            // scale
            const xScalebrush = d3.scaleTime()
                                .domain([d3.min(gtylist) , d3.max(gtylist)])
                                .range([0, width - 5]);

            const xScale = d3.scaleTime()
                            .domain([xScalebrush.invert(selection[0]), xScalebrush.invert(selection[1])])
                            //.domain([d3.min(groundTruth, function(d){ return d.date; }) , d3.max(groundTruth, function(d){ return d.date; }) ])
                            .range([0, width - 5]);
            
            // initial y axis
            var tempgt = groundTruth.map(osd => osd.filter(x => x.date >= xScale.domain()[0] && x.date <= xScale.domain()[1])).flat().map(x => x.y);
            var temppred = prediction.map(osd => osd.filter(x => x.date >= xScale.domain()[0] && x.date <= xScale.domain()[1])).flat().map(x => x.yhat);
            tempgt = [...new Set([...tempgt])];
            temppred = [...new Set([...temppred])];
            if (temppred.length === 0 || temppred.length === 1){
                temppred = [0];
            }

            const yScale = d3.scaleLinear()
                             //.domain([0, Math.max(d3.max(groundTruth, function(d){ return d.y; }), d3.max(prediction, function(d){ return d.yhat; }))])
                             .domain([0, Math.max(d3.max(tempgt), d3.max(temppred))])
                             .range([height - 2*padding, padding]);
            
            // change y axis for zoom
            if (currentZoomState){
                const newXScale = currentZoomState.rescaleX(xScale);
                tempgt = groundTruth.map(osd => osd.filter(x => x.date >= newXScale.domain()[0] && x.date <= newXScale.domain()[1])).flat().map(x => x.y);
                temppred = prediction.map(osd => osd.filter(x => x.date >= newXScale.domain()[0] && x.date <= newXScale.domain()[1])).flat().map(x => x.yhat);
                tempgt = [...new Set([...tempgt])];
                temppred = [...new Set([...temppred])];

                if (temppred.length === 0){
                    temppred = [0];
                }
                xScale.domain(newXScale.domain());
                yScale.domain([0, Math.max(d3.max(tempgt), d3.max(temppred))]);
            }

            
            // Define axes
            var xAxis = d3.axisBottom()
                        .scale(xScale)
                        .ticks(10)
                        .tickFormat(function(d){
                            if (typeof tempgt === "undefined"){ 
                                return d3.timeFormat("%b %Y")(d); 
                            }
                            if (tempgt[0].length < 465){
                                return d3.timeFormat("%d %b %Y")(d)
                            } else {
                                return d3.timeFormat("%b %Y")(d)
                            }
                        });
                        

            //Define Y axis
            var yAxis = d3.axisLeft()
                        .scale(yScale)
                        .ticks(10)
                        .tickFormat(function (d) {
                            if ((d / 1000) >= 1) {
                              d = d / 1000 + "K";
                            } 
                            return d;
                        });

            // line generator
            var line = d3.line()
                        .x(function(d) { return xScale(d.date)})
                        .y(function(d){ return yScale(+d.y)});
                
            var linepred = d3.line()
                            .x(function(d) { return xScale(d.date)})
                            .y(function(d){ return yScale(+d.avg)});
            var linepredind = d3.line()
                                .x(function(d) { return xScale(d.date)})
                                .y(function(d){ return yScale(+d.yhat)});
            
            // gt line
            groundTruth.forEach((e, i) => {
                svg.selectAll("#gtline" + i)
                    .data([e])
                    .join("path")
                    .attr("d", value => line(value))
                    .attr("fill", "none")
                    .attr("stroke", color[i])
                    .attr("id", "gtline"+i);
            })

            var predavg; 
            if (displayModel === "Average"){
                // pred line for each models
                const groupbydate = (arr) => {
                    arr = [...arr.reduce((r, o) => {
                        const key = o.date.toISOString().substring(0, 10);
                        const item = r.get(key) || Object.assign({}, o, {
                            yhat: 0,
                            count: 0
                        });
                        item.yhat += o.yhat;
                        item.count += 1;
                        return r.set(key, item);
                    }, new Map).values()];
                    return arr;
                }
                predavg = prediction.map(x => groupbydate(x));

                // create avg key
                predavg = predavg.map(osd => osd.map(function(e) {
                        var o = Object.assign({}, e);
                        o.avg = +e.yhat/+e.count;
                        return o;
                }));

                predavg.forEach( (arr, idx) => {
                    svg.selectAll("#predline"+idx)
                    .data([arr])
                    .join("path")
                    .attr("d", value => linepred(value))
                    .attr("fill", "none")
                    .attr("stroke", color[props.selectedStation.length + idx])
                    .attr("id", "predline"+idx);
                });
            } else {
                // non average
                var tempcounter = 0
                prediction.forEach((arr, idx) => {
                    selectedModels.forEach((model, idx2) => {
                        svg.selectAll("#predline"+tempcounter)
                        .data([arr.filter(x => x.model === model)])
                        .join("path")
                        .attr("d", value => linepredind(value))
                        .attr("fill", "none")
                        .attr("stroke", color[props.selectedStation.length + tempcounter])
                        .attr("id", "predline"+tempcounter);
                        tempcounter = tempcounter + 1;
                    })
                })
            }
            
            const callout = (g, value) => {
                if (!value) return g.style("display", "none");
                g.style("display", null)
                    .style("pointer-events", "none")
                    .style("font", "10px sans-serif");
              
                const path = g.selectAll("path")
                  .data([null])
                  .join("path")
                    .attr("fill", "white")
                    .attr("stroke", "black");
              
                const text = g.selectAll("text")
                  .data([null])
                  .join("text")
                  .call(text => text
                    .selectAll("tspan")
                    .data((value + "").split(/\n/))
                    .join("tspan")
                      .attr("x", 0)
                      .attr("y", (d, i) => `${i * 1.1}em`)
                      .style("font-weight", (_, i) => i ? null : "bold")
                      .text(d => d));
              
                const {x, y, width: w, height: h} = text.node().getBBox();
              
                text.attr("transform", `translate(${-w / 2},${15-y})`);  
                path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
            }

            function bfunc (mx) {
                const bisect = d3.bisector(d => d.date).left;
                const date = xScale.invert(mx);

                var longestseq = groundTruth.map(x => x.length);
                longestseq = longestseq.indexOf(Math.max(...longestseq)); // index of longest value in sequence gt

                const index = bisect(groundTruth[longestseq], date, 1); // quick fix for now
                const a = groundTruth[longestseq][index - 1]; // quick fix for now
                var b = groundTruth[longestseq][index];   // quick fix for now
                if (typeof b === "undefined"){
                    b = a;
                }
                return (date - a.date > b.date - date) ? b : a;
            }

            const formatDateTooltip = d3.timeFormat("%d %b %Y");
            const checkDateEquality = (x, y) => {
                return (x.getFullYear() === y.getFullYear()) && (x.getMonth() === y.getMonth()) && (x.getDate() === y.getDate());
            }
            
            const tooltip = d3.selectAll(".tooltip"); //props.selectedStation
            svg.on("touchmove mousemove", function(event) {
                const res = bfunc(d3.pointer(event,this)[0]);
                var filteredgt = groundTruth.map(osd => osd.filter(x => checkDateEquality(x.date, res.date)));

                var tooltipstr = '';
                // add actual data
                filteredgt.forEach((elem, idx) => {
                    if (elem.length > 0){
                        tooltipstr = tooltipstr + selectedStation[idx] + ': ' + parseFloat(elem[0].y.toFixed(2)) + '\n'; 
                    }
                }) 

                if (displayModel === "Average"){
                    var filteredpred = predavg.map(osd => osd.filter(x => checkDateEquality(x.date,res.date)));
                    // add prediction data
                    filteredpred.forEach((elem, idx) => {
                        if (elem.length > 0){
                            tooltipstr = tooltipstr + "Pred" + selectedStation[idx] + ': ' + parseFloat(elem[0].yhat.toFixed(2)) + '\n'; 
                        }
                    })
                } else {
                    // add predicted data individually
                    prediction.forEach((arr, idx) => {
                        selectedModels.forEach((model, idx2) => {
                            var temparr = arr.filter(x => x.model === model);
                            temparr = temparr.filter(x => checkDateEquality(x.date, res.date));
                            if (temparr.length > 0){
                                temparr.forEach((elem, idx3) => {
                                    tooltipstr = tooltipstr + selectedStation[idx] + " " + model + ': ' + parseFloat(elem.yhat.toFixed(2)) + '\n'; 
                                })
                            }
                        })
                    })
                }

                tooltip
                    .attr("transform", `translate(${xScale(res.date)},${yScale(0)})`)
                    .call(callout, `${formatDateTooltip(res.date)}\n${tooltipstr}`);
            });
            svg.on("touchend mouseleave", () => tooltip.call(callout, null));
            

            // Create axes
			svg.select(".x-axis")
                .attr("transform", "translate(0," + (height - 2*padding) + ")")
                .call(xAxis);

            svgyaxis.select(".y-axis")
                .attr("transform", "translate(" + (padding - 2) + ",0)")
                .call(yAxis);

            // Axis labels
            svg.selectAll(".xaxislabel")
            .data([1])
            .join(
                enter => enter.append("text").attr("x", (width-padding)/2).attr("y", height - 5).attr("font-size", "12px")
                            .attr("font-weight", 700).attr("class", "xaxislabel").text("Year"),
                update => update.append("text").attr("x", (width-padding)/2).attr("y", height - 5).attr("font-size", "12px")
                             .attr("font-weight", 700).attr("class", "xaxislabel").text("Year"),
                exit => exit.remove()
            ) 

            svgyaxis.selectAll(".yaxislabel")
            .data([1])
            .join(
                enter => enter.append("text").attr("text-anchor", "middle").attr("font-size", "12px").attr("transform", "translate("+ (8) +","+(height/3)+")rotate(-90)")
                            .attr("font-weight", 700).attr("class", "yaxislabel").text("Stream Flow"),
                update => update.append("text").attr("text-anchor", "middle").attr("font-size", "12px").attr("transform", "translate("+ (8) +","+(height/3)+")rotate(-90)")
                             .attr("font-weight", 700).attr("class", "yaxislabel").text("Stream Flow"),
                exit => exit.remove()
            ) 

            // create legend
            var legenddata = [];
            selectedStation.forEach(e => legenddata.push(String(e)));
            if (displayModel === "Average"){
                selectedStation.forEach(e => legenddata.push("Pred" + String(e)));
            } else {
                selectedStation.forEach((e) => {
                    selectedModels.forEach((e2) => {
                        legenddata.push(String(e2) + " " + String(e));
                    })
                });
            }
            

            var legend = svglegend
                            .selectAll(".rectlegend")
                            .data(legenddata);
            legend.join(
                enter => enter.append("rect").attr('x', 5).attr('y', function(d, i) { return (i * 20) + 5}).attr('width', 10).attr('height', 10).attr("class", "rectlegend")
                            .style('fill', function(d, i){ return color[i]; }),
                update => update, 
                exit => exit.remove()
            );


            legend = svglegend
                    .selectAll(".legendlabel")
                    .data(legenddata);
            legend.join(
                enter => enter.append("text").attr('x', 20).attr('y', function(d, i) { return (i * 20) + 15}).text(function(d){ return d; }).attr("class", "legendlabel").attr("font-size", "10px"),
                update => update.text(function(d){ return d; }), 
                exit => exit.remove()
            );               
                
            
            // create title
            svg.selectAll(".plottitle")
                .data([1])
                .join(
                    enter => enter.append("text").attr("x", (width - 2*padding) /2).attr("y", 20).attr("text-anchor", "middle")
                                .attr("font-weight", 700).attr("class", "plottitle").text("StreamFlow for Stations")
                                .style("font-size", "18px").style("text-decoration", "underline"),
                    update => update.append("text").attr("x", (width - 2*padding) /2).attr("y", 20).attr("text-anchor", "middle")
                                .attr("font-weight", 700).style("font-size", "18px").style("text-decoration", "underline").attr("class", "plottitle")
                                .text("StreamFlow for Stations"),
                    exit => exit.remove()
                ) 

            ///////////// zoom on main chart
            zoomBehavior = d3.zoom()
                                .scaleExtent([0.5, 100])
                                .translateExtent([[0,0], [width, height]])
                                .on("zoom", (e) => {
                                    const zoomState = zoomTransform(svg.node());
                                    setCurrentZoomState(zoomState);
                                });
            
            svg.call(zoomBehavior);
        }
    }, [selectedStation, selectedModels, prediction, groundTruth, displayModel, currentZoomState, selection]);

    // static brush chart filter at bottom
    useEffect(() => {
        const svgbrushchart = d3.select(svgbrushChart.current);

        // remove all predline from previous draws
        for (var i = 0; i< 100; i++){
            svgbrushchart.selectAll("#predline"+i).remove();
        }

        // remove all gtline from previous draws
        for (var i = 0; i< 100; i++){
            svgbrushchart.selectAll("#gtline"+i).remove();
        }


        if (typeof prediction !== 'undefined' && typeof groundTruth !== 'undefined'){
            // scale
            const xScalebrush = d3.scaleTime()
                                .domain([d3.min(gtylist) , d3.max(gtylist)])
                                .range([0, width - 5]);
            
            // initial y axis
            var tempgt = groundTruth.map(osd => osd.filter(x => x.date >= xScalebrush.domain()[0] && x.date <= xScalebrush.domain()[1])).flat().map(x => x.y);
            var temppred = prediction.map(osd => osd.filter(x => x.date >= xScalebrush.domain()[0] && x.date <= xScalebrush.domain()[1])).flat().map(x => x.yhat);
            tempgt = [...new Set([...tempgt])];
            temppred = [...new Set([...temppred])];
            if (temppred.length === 0 || temppred.length === 1){
                temppred = [0];
            }

            const yScalebrush = d3.scaleLinear()
                             .domain([0, Math.max(d3.max(tempgt), d3.max(temppred))])
                             .range([height/3 - padding, 0]);

            // Axes
            var xAxisbrush = d3.axisBottom()
                            .scale(xScalebrush)
                            .ticks(10)
                            .tickFormat(formatTime);

            // line generator
            var linebrush  = d3.line()
                .x(function(d) { return xScalebrush(d.date)})
                .y(function(d){ return yScalebrush(+d.y)});

            var linepredbrush = d3.line()
                .x(function(d) { return xScalebrush(d.date)})
                .y(function(d){ return yScalebrush(+d.avg)});

            var linepredindbrush = d3.line()
                .x(function(d) { return xScalebrush(d.date)})
                .y(function(d){ return yScalebrush(+d.yhat)});

            // ground truth line 
            groundTruth.forEach((e, i) => {
                svgbrushchart.selectAll("#gtline" + i)
                    .data([e])
                    .join("path")
                    .attr("d", value => linebrush(value))
                    .attr("fill", "none")
                    .attr("stroke", color[i])
                    .attr("id", "gtline"+i);
            })

            // individual model line
            var predavg; 
            if (displayModel === "Average"){
                // pred line for each models
                const groupbydate = (arr) => {
                    arr = [...arr.reduce((r, o) => {
                        const key = o.date.toISOString().substring(0, 10);
                        const item = r.get(key) || Object.assign({}, o, {
                            yhat: 0,
                            count: 0
                        });
                        item.yhat += o.yhat;
                        item.count += 1;
                        return r.set(key, item);
                    }, new Map).values()];
                    return arr;
                }
                predavg = prediction.map(x => groupbydate(x));

                // create avg key
                predavg = predavg.map(osd => osd.map(function(e) {
                        var o = Object.assign({}, e);
                        o.avg = +e.yhat/+e.count;
                        return o;
                }));

                predavg.forEach( (arr, idx) => {
                    svgbrushchart.selectAll("#predline"+idx)
                    .data([arr])
                    .join("path")
                    .attr("d", value => linepredbrush(value))
                    .attr("fill", "none")
                    .attr("stroke", color[props.selectedStation.length + idx])
                    .attr("id", "predline"+idx);
                });
            } else {
                // non average
                var tempcounter = 0
                prediction.forEach((arr, idx) => {
                    selectedModels.forEach((model, idx2) => {
                        svgbrushchart.selectAll("#predline"+tempcounter)
                        .data([arr.filter(x => x.model === model)])
                        .join("path")
                        .attr("d", value => linepredindbrush(value))
                        .attr("fill", "none")
                        .attr("stroke", color[props.selectedStation.length + tempcounter])
                        .attr("id", "predline"+tempcounter);
                        tempcounter = tempcounter + 1;
                    })
                })
            }

            // Create axes
            svgbrushchart.select(".x-axis")
                .attr("transform", "translate(0," + (height/3 - padding) + ")")
                .call(xAxisbrush);
            
            brush.on("start brush end", (x) => {
                if (x.selection){
                    const indexselection = x.selection; // pixel value
                    setSelection(indexselection);
                }
            });

            if (previousSelection === selection){
                svgbrushchart
                .select(".brush")
                .call(brush)
                .call(brush.move, selection);
            } else if (firstRender){
                // initial render of brush
                svgbrushchart
                .select(".brush")
                .call(brush)
                .call(brush.move, selection);
                setFirstRender(false);
            }

        }
    }, [selectedStation, selectedModels, prediction, groundTruth, displayModel]);


    const handleResetZoom = () => {
        d3.select(svgRef.current).call(zoomBehavior.transform, d3.zoomIdentity);
        setCurrentZoomState();
    }

    const handleResetBrush = () => {
        const svgbrushchart = d3.select(svgbrushChart.current);

        // set brush selection
        setSelection([0, width]);

        // move brush
        svgbrushchart
        .select(".brush")
        .call(brush)
        .call(brush.move, [0, width]);

    }

    const handleSelectedYearView = (e, val) => {
        const svgbrushchart = d3.select(svgbrushChart.current);

        // brush xscale
        const xScalebrush = d3.scaleTime()
        .domain([d3.min(gtylist) , d3.max(gtylist)])
        .range([0, width - 5]);

        var startenddate = [new Date(val, 0, 1), new Date(val, 11, 31)]; // [1 Jan Year, 31 Dec Year]
        var startenddatepixels = [xScalebrush(startenddate[0]), xScalebrush(startenddate[1])];

        // set current year selection
        setSelectedYearView(val);
        // set brush selection
        setSelection(startenddatepixels);
        
        // repeat this from top
        brush.on("start brush end", (x) => {
            if (x.selection){
                const indexselection = x.selection; // pixel value
                setSelection(indexselection);
            }
        });

        // move brush
        svgbrushchart
        .select(".brush")
        .call(brush)
        .call(brush.move, startenddatepixels);

    }

    return (
        <div>
            {props.selectedStationData? 
                <div style={{margin: "20px"}}>
                    <div style={{display: "flex", alignItems: "center"}}>
                        <svg ref={svgRefyAxis} width={padding} height={height}>
                            <g className="y-axis"></g>
                        </svg>
                        <svg ref={svgRef} width = {width} height = {height}>
                            <defs>
                                <clipPath>
                                    <rect x={padding} y={padding} width={width - padding} height={height - padding}></rect>
                                </clipPath>
                            </defs>
                            <g className="x-axis"></g>
                            <g className="tooltip"></g>
                        </svg>
                        <svg ref={svgReflegend} width={padding * 3} height={height}>
                        </svg>
                    </div>
                    <div style={{display: "flex", alignItems: "center", marginTop: "10px", marginBottom: "10px"}}>
                        <p style={{marginLeft: "38.75px", fontWeight: "bold", marginTop: "10px", marginRight: "50px"}}>Drag to Brush and Filter Line Chart: </p>
                        <Button size="small" color="secondary" style={{marginLeft: "20px"}} variant="contained" onClick={() => handleResetZoom()}>Reset Zoom Line Chart</Button>
                        <Button size="small" color="primary" style={{marginLeft: "20px"}} variant="contained" onClick={() => handleResetBrush()}>Reset Brush</Button>
                    </div>
                    <svg ref={svgbrushChart} width={width} height={height/3} style={{marginLeft: "38.75px"}}>
                        <g className="x-axis"></g>
                        <g className="brush"></g>
                    </svg>
                    <div style={{marginTop: "10px", marginBottom: "10px"}}>
                        <p style={{marginLeft: "38.75px", fontWeight: "bold", marginTop: "10px"}}>Drag Slider to filter by Year: </p>
                        <br/>
                        <Slider style={{marginLeft: "38.75px", width: "1000px", height: "20px", marginTop: "20px"}} value={selectedYearView}
                            aria-labelledby="discrete-slider"
                            step={1} marks={true}
                            min={selectedYear[0]} max={selectedYear.slice(-1)[0]}
                            valueLabelDisplay="on"
                            onChange={(e, v) => handleSelectedYearView(e, v)}
                        />
                    </div>
                </div>
            : null}
        </div>
    )
}

export default LinechartMultiple;
