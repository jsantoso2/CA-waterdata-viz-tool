import React, {useRef, useState, useEffect} from 'react';
import * as d3 from 'd3';
import * as d3Collection from 'd3-collection';
import { FormControl, NativeSelect, InputLabel } from '@material-ui/core';
import d3Tip from "d3-tip";
import { legendColor } from 'd3-svg-legend';

function Heatmap(props) {

    const svgRef = useRef();
    const legendRef = useRef();
    const breakdownRef = useRef();
    const breakdownlegendRef = useRef();

    // constants for svg properties
    const height = 500;
    const width = 500;
    const padding = 40;

    // passed properties
    var oneselectedStation = props.oneselectedStation;
    var selectedModels = props.selectedModels; 
    var selectedYear = props.selectedYear;    // [1979, 2019];
    //var selectedStationData = props.selectedStationData; //[station0: [pred, actual, staid], station1: [pred, actual, staid]]
    var prediction = props.prediction; 
    var groundTruth = props.groundTruth; 

    // model list + actual
    var selectOptions = ["Actual"];
    selectedModels.forEach(elem => selectOptions.push(elem));

    var aggregationdata = ["Week", "Month"]

    // to set filters
    const [selectedX, setSelectedX] = useState(selectOptions[0]);
    const [selectedY, setSelectedY] = useState(selectOptions[0]);
    const [selectedXList, setSelectedXList] = useState([]);
    const [selectedYList, setSelectedYList] = useState([]);

    const [selectedXYear, setSelectedXYear] = useState();
    const [selectedYYear, setSelectedYYear] = useState();

    const [aggregation, setAggregation] = useState(aggregationdata[0]);

    var temparr;
    // initial load filters
    useEffect(() => {
        if (typeof prediction !== "undefined" && typeof groundTruth !== "undefined"){     
            // set x list
            if (selectedX === "Actual"){
                temparr = groundTruth.map(x => x.date.getFullYear());
                temparr = [...new Set([...temparr])];
                temparr = Array.from(temparr).sort();
                setSelectedXList(temparr);
                setSelectedXYear(temparr[0]); //set default value
            } else {
                temparr = prediction.filter(x => x.model === selectedX).map(y => y.date.getFullYear());
                temparr = [...new Set([...temparr])];
                temparr = Array.from(temparr).sort();
                setSelectedXList(temparr);
                setSelectedXYear(temparr[0]); //set default value REMINDER CHANGE BACK TO 0
            }

            // set y list
            if (selectedY === "Actual"){
                temparr = groundTruth.map(x => x.date.getFullYear());
                temparr = [...new Set([...temparr])];
                temparr = Array.from(temparr).sort();
                setSelectedYList(temparr);
                setSelectedYYear(temparr[0]); //set default value
            } else {
                temparr = prediction.filter(x => x.model === selectedX).map(y => y.date.getFullYear());
                temparr = [...new Set([...temparr])];
                temparr = Array.from(temparr).sort();
                setSelectedXList(temparr);
                setSelectedYYear(temparr[0]); //set default value REMINDER CHANGE BACK TO 0
            }
        }
    }, []);


    useEffect(() => {
        // d3 code
        const svg = d3.select(svgRef.current);
        const legendsvg = d3.select(legendRef.current);
        const breakdownsvg = d3.select(breakdownRef.current);
        const breakdownlegendsvg = d3.select(breakdownlegendRef.current);

        if (typeof prediction !== "undefined" && typeof groundTruth !== "undefined"){
            svg.selectAll(".matrixsq").remove();
            svg.selectAll(".xlabel").remove();
            svg.selectAll(".ylabel").remove();
            svg.selectAll(".tooltiphm").remove();

            var xdata = [];
            var ydata = [];
            // DATA filtering
            // xdata
            if (selectedX === "Actual"){
                xdata = groundTruth.filter(x => x.date.getFullYear() === +selectedXYear);
            } else {
                xdata = prediction.filter(x => x.date.getFullYear() === +selectedXYear && x.model === selectedX);
                xdata = xdata.map(x => {return {date: x.date, y: x.yhat}}); //mapping key so its easier
            }
            // ydata
            if (selectedY === "Actual"){
                ydata = groundTruth.filter(x => x.date.getFullYear() === +selectedYYear);
            } else {
                ydata = prediction.filter(x => x.date.getFullYear() === +selectedYYear && x.model === selectedY);
                ydata = ydata.map(x => {return {date: x.date, y: x.yhat}}); //mapping key so its easier
            }
            
            // https://www.w3resource.com/javascript-exercises/javascript-date-exercise-24.php
            function ISO8601_week_no(dt) {
                var tdt = new Date(dt.valueOf());
                var dayn = (dt.getDay() + 6) % 7;
                tdt.setDate(tdt.getDate() - dayn + 3);
                var firstThursday = tdt.valueOf();
                tdt.setMonth(0, 1);
                if (tdt.getDay() !== 4) {
                 tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
                }
                
                var ans = 1 + Math.ceil((firstThursday - tdt) / 604800000);
                if (dt.getMonth() === 11 && ans === 1){
                    return 99; // handle overflow to nxt year
                } else if (dt.getMonth() === 0 && (ans === 52 || ans === 53)){
                   return -1; // handle underflow from prev year
                }
                return ans
           }

            // add day of week key
            xdata = xdata.map(function(el) {
                var o = Object.assign({}, el);
                o.week = ISO8601_week_no(o.date);
                o.month = o.date.getMonth() + 1; // 1 - 12
                return o;
            });

            // add day of week key
            ydata = ydata.map(function(el) {
                var o = Object.assign({}, el);
                o.week = ISO8601_week_no(o.date);
                o.month = o.date.getMonth() + 1; // 1-12
                return o;
            });

            // need to groupby 
            if (aggregation === "Week"){
                xdata = d3Collection.nest().key(function(d){ return d.week; })
                        .entries(xdata);
                                
                // add day details
                xdata = xdata.map(function(el) {
                    var o = Object.assign({}, el);
                    var temp = o.values;
                    o.value = d3.sum(temp, function(d){ return d.y; });
                    o.startdate = new Date(Math.max.apply(null,temp.map(x => x.date)));
                    o.enddate = new Date(Math.min.apply(null,temp.map(x => x.date)));
                    return o;
                });

                ydata = d3Collection.nest().key(function(d){ return d.week; })
                                .entries(ydata);

                // add day details
                ydata = ydata.map(function(el) {
                    var o = Object.assign({}, el);
                    var temp = o.values;
                    o.value = d3.sum(temp, function(d){ return d.y; });
                    o.startdate = new Date(Math.max.apply(null,temp.map(x => x.date)));
                    o.enddate = new Date(Math.min.apply(null,temp.map(x => x.date)));
                    return o;
                });
            } else {
                xdata = d3Collection.nest().key(function(d){ return d.month; })
                                .entries(xdata);

                 // add day details
                 xdata = xdata.map(function(el) {
                    var o = Object.assign({}, el);
                    var temp = o.values;
                    o.value = d3.sum(temp, function(d){ return d.y; });
                    o.startdate = new Date(Math.max.apply(null,temp.map(x => x.date)));
                    o.enddate = new Date(Math.min.apply(null,temp.map(x => x.date)));
                    return o;
                });

                ydata = d3Collection.nest().key(function(d){ return d.month; })
                                .entries(ydata);
                
                // add day details
                ydata = ydata.map(function(el) {
                    var o = Object.assign({}, el);
                    var temp = o.values;
                    o.value = d3.sum(temp, function(d){ return d.y; });
                    o.startdate = new Date(Math.max.apply(null,temp.map(x => x.date)));
                    o.enddate = new Date(Math.min.apply(null,temp.map(x => x.date)));
                    return o;
                });
            }
    
            var imapx = new Map();
            var imapy = new Map();

            // double for loop for iteration
            var matrixdata = [];
            xdata.forEach((x, i) => {
                ydata.forEach((y, i2) => {
                    imapx[i] = +x.key;
                    imapy[i2] = +y.key;
                    matrixdata.push({ix: i, iy: i2, valx: +x.key, valy: +y.key, value: x.value - y.value, xarr: x.values, yarr: y.values});

                })
            }); 
            
            var xdomain = matrixdata.map(x => x.ix);
            var ydomain = matrixdata.map(x => x.iy);
            xdomain = [...new Set(xdomain)];
            ydomain = [...new Set(ydomain)];

            // BuildScales:
            var xScale = d3.scaleBand()
                            .domain(xdomain)
                            .range([padding, width - padding]);
            
            var yScale = d3.scaleBand()
                            .domain(ydomain)
                            .range([padding, height-padding]);
            
            var colorscale = d3.scaleLinear()
                               .domain([d3.min(matrixdata, function(d){ return Math.abs(d.value); }), d3.max(matrixdata, function(d){ return Math.abs(d.value); })])
                               .range(["white", "blue"]);

            // tooltip
            var tip = d3Tip()
                        .attr("visible", "visible")
                        .attr('class', 'd3-tip')
                        .offset([-10, 0])
                        .html(function(d) {
                            if (aggregation === "Week"){
                                return "<strong style='color:white'>Week</strong> <span style='color:white'>" + d3.select(this).attr("valx") + " vs " + d3.select(this).attr("valy") + "</span>"
                                + "<br/>" + "<span style='color:white'>Value: "  + Math.round(d3.select(this).attr("value"));
                            } else {
                                return "<strong style='color:white'>Month</strong> <span style='color:white'>" + d3.select(this).attr("valx") + " vs " + d3.select(this).attr("valy") + "</span>"
                                + "<br/>" + "<span style='color:white'>Value: "  + Math.round(d3.select(this).attr("value"));
                            }
                          
                        })
                        .style("background-color", "black");


            // add the squares
            svg.selectAll(".matrixsq")
                .data(matrixdata)
                .enter()
                .append("rect")
                .attr("x", function(d){ return xScale(d.ix)})
                .attr("y", function(d){ return yScale(d.iy)})
                .attr("width", xScale.bandwidth())
                .attr("height", yScale.bandwidth())
                .style("fill", function(d) { return colorscale(Math.abs(d.value))})
                .attr("valx", function(d){ return d.valx})
                .attr("valy", function(d){ return d.valy})
                .attr("value", function(d) { return d.value})
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("class", "matrixsq")
                .on("mouseover", tip.show)
                .on("mouseleave", tip.hide)
                .on("click", function(e, d){
                    var matrixdataclick = [];
                    d.xarr.forEach((x, i) => {
                        d.yarr.forEach((y, i2) => {
                            matrixdataclick.push({ix: i, iy: i2, valx: x.date, valy: y.date, value: x.y - y.y});
        
                        })
                    }); 

                    // create new heatmap
                    var xdomainclick = matrixdataclick.map(x => x.ix);
                    var ydomainclick = matrixdataclick.map(x => x.iy);
        
                    // BuildScales:
                    var xScaleclick = d3.scaleBand()
                                    .domain(xdomainclick)
                                    .range([padding, width - padding]);
                    
                    var yScaleclick = d3.scaleBand()
                                    .domain(ydomainclick)
                                    .range([padding, height-padding]);
                    
                    var colorscaleclick = d3.scaleLinear()
                                       .domain([d3.min(matrixdataclick, function(d){ return Math.abs(d.value); }), d3.max(matrixdataclick, function(d){ return Math.abs(d.value); })])
                                       .range(["white", "red"]);

                    // tooltip
                    var tipbreakdown = d3Tip()
                        .attr("visible", "visible")
                        .attr('class', 'd3-tip')
                        .offset([-10, 0])
                        .html(function(d) {
                            return "<strong style='color:white'>Date</strong> <span style='color:white'>" + d3.select(this).attr("valx") + " vs " + d3.select(this).attr("valy") + "</span>"
                            + "<br/>" + "<span style='color:white'>Value: "  + Math.round(d3.select(this).attr("value") * 100) / 100;
                        })
                        .style("background-color", "black");
                        
                    breakdownsvg.selectAll(".matrixsq")
                        .data(matrixdataclick)
                        .join(
                            enter => enter.append("rect").attr("x", function(d){ return xScaleclick(d.ix)}).attr("y", function(d){ return yScaleclick(d.iy)})
                                        .attr("width", xScaleclick.bandwidth()).attr("height", yScaleclick.bandwidth()).style("fill", function(d){ return colorscaleclick(Math.abs(d.value))})
                                        .attr("class", "matrixsq").attr("valx", function(d){ return d.valx.toISOString().substring(0, 10)}).attr("valy", function(d){ return d.valy.toISOString().substring(0, 10)}).attr("value", function(d){ return +d.value})
                                        .attr("stroke", "black").attr("stroke-width", 1),
                            update => update.attr("x", function(d){ return xScaleclick(d.ix)}).attr("y", function(d){ return yScaleclick(d.iy)})
                                    .attr("width", xScaleclick.bandwidth()).attr("height", yScaleclick.bandwidth()).style("fill", function(d){ return colorscaleclick(Math.abs(d.value))})
                                    .attr("class", "matrixsq").attr("valx", function(d){ return d.valx.toISOString().substring(0, 10)}).attr("valy", function(d){ return d.valy.toISOString().substring(0, 10)}).attr("value", function(d){ return +d.value})
                                    .attr("stroke", "black").attr("stroke-width", 1),
                            exit => exit.remove()
                        )
                        .on("mouseover", tipbreakdown.show)
                        .on("mouseleave", tipbreakdown.hide);

                    breakdownsvg.call(tipbreakdown);

                    // labels
                    breakdownsvg.selectAll(".xlabel")
                        .data(xdomainclick)
                        .join(
                            enter => enter.append("text").attr("font-size", "8px").attr("x", function(d){ return xScaleclick(d) + xScaleclick.bandwidth()/2})
                                        .attr("y", height - padding/1.5).attr("class", "xlabel").text(function(d){ return d + 1}).attr("text-anchor", "middle"),
                            update => update.attr("font-size", "8px").attr("x", function(d){ return xScaleclick(d) + xScaleclick.bandwidth()/2})
                                        .attr("y", height - padding/1.5).attr("class", "xlabel").text(function(d){ return d + 1}).attr("text-anchor", "middle"),
                            exit => exit.remove()
                        ); 
                    
                    breakdownsvg.selectAll(".ylabel")
                        .data(ydomainclick)
                        .join(
                            enter => enter.append("text").attr("font-size", "8px").attr("x", padding/1.5).attr("text-anchor", "middle")
                                        .attr("y", function(d){ return yScaleclick(d) + yScaleclick.bandwidth()/2}).attr("class", "ylabel").text(function(d){ return d + 1}),
                            update => update.attr("font-size", "8px").attr("x", padding/1.5).attr("text-anchor", "middle")
                                    .attr("y", function(d){ return yScaleclick(d) + yScaleclick.bandwidth()/2}).attr("class", "ylabel").text(function(d){ return d + 1}),
                            exit => exit.remove()
                    );

                     // labels for axis
                    breakdownsvg.selectAll(".xaxlabel")
                        .data([d])
                        .join(
                            enter => enter.append("text").attr("font-size", "10px").attr("x", width/2).attr("y", height - padding/4)
                                        .attr("font-weight", 700).attr("class", "xaxlabel").text(function(d){ if (aggregation === "Week"){ return "Week " + d.valx; } else { return "Month " + d.valx; }}),
                            update => update.attr("font-size", "10px").attr("x", width/2).attr("y", height - padding/4)
                                        .attr("font-weight", 700).attr("class", "xaxlabel").text(function(d){ if (aggregation === "Week"){ return "Week " + d.valx ; } else { return "Month " + d.valx; }}),
                            exit => exit.remove()
                        ); 
                    
                    breakdownsvg.selectAll(".yaxlabel")
                        .data([d])
                        .join(
                            enter => enter.append("text").attr("text-anchor", "end").attr("font-size", "10px").attr("x", 0).attr("y", 0).attr("transform","rotate(-90)translate(" + -width/2 + ","  + padding / 2 + ")")
                                        .attr("font-weight", 700).attr("class", "yaxlabel").text(function(d){ if (aggregation === "Week"){ return "Week " + d.valy; } else { return "Month " + d.valy; }}),
                            update => update.attr("text-anchor", "end").attr("font-size", "10px").attr("x", 0).attr("y", 0).attr("transform","rotate(-90)translate(" + -width/2 + ","  + padding / 2 + ")")
                                        .attr("font-weight", 700).attr("class", "yaxlabel").text(function(d){ if (aggregation === "Week"){ return "Week " + d.valy ; } else { return "Month " + d.valy; }}),
                            exit => exit.remove()
                    ); 
                    
                    // title
                    breakdownsvg.selectAll(".breakdowntitle")
                        .data([d])
                        .join(
                            enter => enter.append("text").attr("x", width/2).attr("y", padding/2).text(function(d){ if (aggregation === "Week"){ return "Week " + d.valx + " vs " + d.valy; } else { return "Month " + d.valx + " vs " + d.valy}})
                                        .attr("class", "breakdowntitle").attr("font-weight", 700).attr("text-anchor", "middle"),
                            update => update.attr("x", width/2).attr("y", padding/2).text(function(d){ if (aggregation === "Week"){ return "Week " + d.valx + " vs " + d.valy; } else { return "Month " + d.valx + " vs " + d.valy}})
                                        .attr("class", "breakdowntitle").attr("font-weight", 700).attr("text-anchor", "middle"),
                            exit => exit.remove()
                    );
                    
                    // add breakdown legend
                    var legendLinearbd = legendColor()
                                            .labelFormat(d3.format(".1f"))
                                            .shapeWidth(30)
                                            .cells(10)
                                            .orient('vertical')
                                            .scale(colorscaleclick);
                    
                    breakdownlegendsvg.selectAll(".legendtitle")
                        .data([1])
                        .join(
                            enter => enter.append("text").attr("x", 10).attr("y", 10).text("Legend")
                                        .attr("class", "legendtitle").attr("font-weight", 700),
                            update => update.attr("x", 10).attr("y", 10).text("Legend")
                                        .attr("class", "legendtitle").attr("font-weight", 700),
                            exit => exit.remove()
                    );


                    breakdownlegendsvg.select(".legendLinear")
                                    .attr("transform", "translate(0," + (padding/2) + ")")
                                    .call(legendLinearbd)

                });
            
            svg.call(tip);

            // labels
            var uniqx = xdomain.map(x => { return {ix: x, valx: imapx[x]}});
            var uniqy = ydomain.map(x => { return {iy: x, valy: imapy[x]}});
            svg.selectAll(".xlabel")
                .data(uniqx)
                .join(
                    enter => enter.append("text").attr("font-size", "8px").attr("x", function(d){ return xScale(d.ix) + xScale.bandwidth()/2})
                                .attr("y", height - padding/1.5).attr("class", "xlabel").text(function(d){ return d.valx}).attr("text-anchor", "middle"),
                    update => update.attr("font-size", "8px").attr("x", function(d){ return xScale(d.ix) + xScale.bandwidth()/2})
                                .attr("y", height - padding/1.5).attr("class", "xlabel").text(function(d){ return d.valx}).attr("text-anchor", "middle"),
                    exit => exit.remove()
                ); 
            
            svg.selectAll(".ylabel")
                .data(uniqy)
                .join(
                    enter => enter.append("text").attr("font-size", "8px").attr("x", padding/1.5).attr("text-anchor", "middle")
                                .attr("y", function(d){ return yScale(d.iy) + yScale.bandwidth()/2}).attr("class", "ylabel").text(function(d){ return d.valy}),
                    update => update.attr("font-size", "8px").attr("x", padding/1.5).attr("text-anchor", "middle")
                              .attr("y", function(d){ return yScale(d.iy) + yScale.bandwidth()/2}).attr("class", "ylabel").text(function(d){ return d.valy}),
                    exit => exit.remove()
            );
            
            
            // labels for axis
            svg.selectAll(".xaxlabel")
                .data([1])
                .join(
                    enter => enter.append("text").attr("font-size", "10px").attr("x", width/2).attr("y", height - padding/4)
                                .attr("font-weight", 700).attr("class", "xaxlabel").text(function(d){ if (aggregation === "Week"){ return "Week " + selectedXYear; } else { return "Month " + selectedXYear; }}),
                    update => update.attr("font-size", "10px").attr("x", width/2).attr("y", height - padding/4)
                                .attr("font-weight", 700).attr("class", "xaxlabel").text(function(d){ if (aggregation === "Week"){ return "Week "+ selectedXYear; } else { return "Month " + selectedXYear; }}),
                    exit => exit.remove()
                ); 
            
            svg.selectAll(".yaxlabel")
                .data([1])
                .join(
                    enter => enter.append("text").attr("text-anchor", "end").attr("font-size", "10px").attr("x", 0).attr("y", 0).attr("transform","rotate(-90)translate(" + -width/2 + ","  + padding / 2 + ")")
                                .attr("font-weight", 700).attr("class", "yaxlabel").text(function(d){ if (aggregation === "Week"){ return "Week " + selectedYYear; } else { return "Month " + selectedYYear; }}),
                    update => update.attr("text-anchor", "end").attr("font-size", "10px").attr("x", 0).attr("y", 0).attr("transform","rotate(-90)translate(" + -width/2 + ","  + padding / 2 + ")")
                                .attr("font-weight", 700).attr("class", "yaxlabel").text(function(d){ if (aggregation === "Week"){ return "Week " + selectedYYear; } else { return "Month " + selectedYYear; }}),
                    exit => exit.remove()
            ); 
            
            
            // legend
            var legendLinear = legendColor()
                .labelFormat(d3.format(".0f"))
                .shapeWidth(30)
                .cells(20)
                .orient('vertical')
                .scale(colorscale);
              
            legendsvg.select(".legendLinear")
                .attr("transform", "translate(0," + (padding/2) + ")")
                .call(legendLinear)
        }

    }, [oneselectedStation, selectedModels, selectedYear, groundTruth, prediction, selectedXYear, selectedYYear, aggregation]);
   


    const handleSelectedX = (e) => {
        setSelectedX(e.target.value);
        // set x list
        if (e.target.value === "Actual"){
            temparr = groundTruth.map(x => x.date.getFullYear());
            temparr = [...new Set([...temparr])];
            temparr = Array.from(temparr).sort();
            setSelectedXList(temparr);
            setSelectedXYear(temparr[0]); //set default value
        } else {
            temparr = prediction.filter(x => x.model === e.target.value).map(y => y.date.getFullYear());
            temparr = [...new Set([...temparr])];
            temparr = Array.from(temparr).sort();
            setSelectedXList(temparr);
            setSelectedXYear(temparr[0]); //set default value
        }
    }

    const handleSelectedY = (e) => {
        setSelectedY(e.target.value);
        // set Y list
        if (e.target.value === "Actual"){
            temparr = groundTruth.map(x => x.date.getFullYear());
            temparr = [...new Set([...temparr])];
            temparr = Array.from(temparr).sort();
            setSelectedYList(temparr);
            setSelectedYYear(temparr[0]); //set default value
        } else {
            temparr = prediction.filter(x => x.model === e.target.value).map(y => y.date.getFullYear());
            temparr = [...new Set([...temparr])];
            temparr = Array.from(temparr).sort();
            setSelectedYList(temparr);
            setSelectedYYear(temparr[0]); //set default value
        }
    }


    return (
        <div style={{marginLeft: "20px"}}>
            <div style={{display: "flex", alignItems: "center"}} >
                <FormControl style={{marginRight: "2rem"}}>
                    <InputLabel shrink>Aggregation: </InputLabel>
                    <NativeSelect onChange={(e) => setAggregation(e.target.value)}>
                        {aggregationdata.map(x => <option value={x} key={x}>{x}</option>)}
                    </NativeSelect>
                </FormControl>
                <p style={{marginRight: "1rem"}}><b>XAxis: </b></p>
                <FormControl>
                    <InputLabel shrink>Model: </InputLabel>
                    <NativeSelect onChange={(e) => handleSelectedX(e)}>
                        {selectOptions.map(x => <option value={x} key={x}>{x}</option>)}
                    </NativeSelect>
                </FormControl>
                <FormControl style={{marginRight: "2rem"}}>
                    <InputLabel shrink>Year: </InputLabel>
                    <NativeSelect onChange={(e) => setSelectedXYear(e.target.value)} value={selectedXYear}>
                        {selectedXList.map(x => <option value={x} key={x}>{x}</option>)}
                    </NativeSelect>
                </FormControl>
                <p style={{marginRight: "1rem"}}><b>YAxis: </b></p>
                <FormControl>
                    <InputLabel shrink>Model: </InputLabel>
                    <NativeSelect onChange={(e) => handleSelectedY(e)}>
                        {selectOptions.map(x => <option value={x} key={x}>{x}</option>)}
                    </NativeSelect>
                </FormControl>
                <FormControl>
                    <InputLabel shrink>Year: </InputLabel>
                    <NativeSelect onChange={(e) => setSelectedYYear(e.target.value)} value={selectedYYear}>
                        {selectedYList.map(x => <option value={x} key={x}>{x}</option>)}
                    </NativeSelect>
                </FormControl>
            </div>
            <h3 style={{marginTop: "20px"}}>{"Heatmap for Station " + oneselectedStation}</h3>
            <p>Click on box to view breakdown by day!</p>
            <div style={{display: "flex", alignItems: "center"}}>
                <svg ref={svgRef} width = {width} height = {height}>
                    <g className="y-axis"></g>
                    <g className="x-axis"></g>
                </svg>
                <svg ref={legendRef} width = {width / 5} height={height}>
                    <text x="10" y="10" fontWeight="700">Legend</text>
                    <g className="legendLinear"></g>
                </svg>
                <svg ref={breakdownRef} width={width} height = {height}>
                    <g className="y-axis"></g>
                    <g className="x-axis"></g>
                </svg>
                <svg ref={breakdownlegendRef} width={width / 5} height = {height}>
                    <g className="legendLinear"></g>
                </svg>
            </div>
        </div>
    )
}

export default Heatmap;
