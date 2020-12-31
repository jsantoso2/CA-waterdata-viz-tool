import React, {useRef, useState, useEffect} from 'react';
import * as d3 from 'd3';
import * as d3Collection from 'd3-collection';
import d3Tip from "d3-tip";
import { FormControl, NativeSelect, InputLabel } from '@material-ui/core';


function Barchart(props) {
    var window_width = window.innerWidth;
    var window_height = window.innerHeight;

    const svgRefyAxis = useRef();
    const svgRef = useRef();
    const legendRef = useRef();

    // constants for svg properties
    const height = window_height * 0.75;
    const width = window_width * 0.85;
    const padding = 40;

    var color = ["blue", "orange"];

    // passed properties
    var selectedStation = props.selectedStation;
    const [oneselectedStation, setOneSelectedStation] = useState(props.selectedStation[0]);    
    var selectedModels = props.selectedModels; 
    var selectedYear = props.selectedYear;    // [1979, 2019];
    // var prediction = props.selectedStationData.filter(x => +x[2] === +oneselectedStation)[0][0];
    // var groundTruth = props.selectedStationData.filter(x => +x[2] === +oneselectedStation)[0][1];
    var prediction;
    var groundTruth;
    if (props.selectedStationData.length > 1) {
        prediction = props.selectedStationData.filter(x => +x[2] === +oneselectedStation)[0][0];
        groundTruth = props.selectedStationData.filter(x => +x[2] === +oneselectedStation)[0][1];
    } else {
        prediction = props.selectedStationData[0][0];
        groundTruth = props.selectedStationData[0][1];
    }

    const [currentDispModel, setCurrentDispModel] = useState("Average");


    // intial load
    useEffect(() => {
        if (props.selectedStationData.length === 1) {
            setOneSelectedStation(selectedStation[0]);
        }

        // d3 code
        const svgyaxis = d3.select(svgRefyAxis.current);
        const svg = d3.select(svgRef.current);
        const svglegend = d3.select(legendRef.current);

        if (typeof prediction !== "undefined" && typeof groundTruth !== "undefined" && groundTruth.length > 0 && prediction.length > 0){
            prediction = prediction.filter(x => x.date.getFullYear() >= selectedYear[0] && x.date.getFullYear() <= selectedYear[1]);
            groundTruth = groundTruth.filter(x => x.date.getFullYear() >= selectedYear[0] && x.date.getFullYear() <= selectedYear[1]);
            
            var allyear = groundTruth.map(x => x.date.getFullYear());
            allyear = [...new Set([...allyear])];
            allyear = Array.from(allyear).sort();

            var groundTruthmod = groundTruth.map((x) => { 
                if (x.y === -999){ // if does not exist
                    return {date: x.date, y: x.ae} 
                } else {
                    return {date: x.date, y: x.y}
                }
            });

            groundTruthmod = d3Collection.nest().key(function(d){ return d.date.getFullYear(); })
            .rollup(function(v){  return d3.sum(v, function(d) { return d.y; }); })
            .entries(groundTruthmod);

            var predictionmod;
            if (currentDispModel === "Average"){
                predictionmod = prediction.filter(x => selectedModels.includes(x.model));
                predictionmod = d3Collection.nest().key(function(d){ return d.date.getFullYear(); })
                .rollup(function(v){  return d3.sum(v, function(d) { return d.yhat; }); })
                .entries(predictionmod);
                predictionmod = predictionmod.map((x) => {return {key: x.key, value: x.value/selectedModels.length}});

            } else {
                predictionmod = prediction.filter(x => x.model === currentDispModel);
                predictionmod = d3Collection.nest().key(function(d){ return d.date.getFullYear(); })
                .rollup(function(v){  return d3.sum(v, function(d) { return d.yhat; }); })
                .entries(predictionmod);

            }    

            
            if (groundTruthmod.length > 0){
                const xScale = d3.scaleBand()
                .domain(allyear)
                .range([0, width]);
                
                var yScale;
                if (predictionmod.length > 0){
                    yScale = d3.scaleLinear()
                    .domain([0, Math.max(d3.max(groundTruthmod, x => x.value), d3.max(predictionmod, x=>x.value))])
                    .range([height - padding, padding]);
                } else {
                    yScale = d3.scaleLinear()
                    .domain([0, d3.max(groundTruthmod, x => x.value)])
                    .range([height - padding, padding]);
                }
    
               
                // tooltip
                var tip = d3Tip()
                    .attr("visible", "visible")
                    .attr('class', 'd3-tip')
                    .offset([-2, 0])
                    .html(function(d) {
                        if (+d3.select(this).attr("pred") !== -999){
                            return "<strong style='color:white'>Year: </strong>" + "<span style='color:white'>" + d3.select(this).attr("year")
                            + "<br/>" + "<span style='color:white'>Actual/AE: "  + Math.round(d3.select(this).attr("actual") * 100) / 100
                            + "<br/>" + "<span style='color:white'>Prediction: "  + Math.round(d3.select(this).attr("pred") * 100) / 100;
                        } else {
                            return "<strong style='color:white'>Year: </strong>" + "<span style='color:white'>" + d3.select(this).attr("year")
                            + "<br/>" + "<span style='color:white'>Actual/AE: "  + Math.round(d3.select(this).attr("actual") * 100) / 100;
                        }
                    })
                    .style("background-color", "black");
                
                svg.call(tip);
                    
                // add bar charts
                svg.selectAll(".bcgt")
                .data(groundTruthmod)
                .join(
                    enter => enter.append("rect").attr("x", function(d){ return xScale(+d.key)}).attr("y", function(d){ return yScale(d.value) })
                                    .attr("width", xScale.bandwidth() / 2).attr("height", function(d){ return height - yScale(d.value) - padding})
                                    .attr("class", "bcgt").attr("fill", color[0]).attr("actual", function(d){ return d.value }).attr("year", function(d){ return +d.key})
                                    .attr("pred", function(d){ 
                                        if (predictionmod.filter(x => x.key === d.key).length > 0){
                                            return predictionmod.filter(x => x.key === d.key)[0].value;
                                        } else {
                                            return -999;
                                        }
                                    }),
                    update => update.attr("x", function(d){ return xScale(+d.key)}).attr("y", function(d){ return yScale(d.value) })
                                    .attr("width", xScale.bandwidth() / 2).attr("height", function(d){ return height - yScale(d.value) - padding})
                                    .attr("class", "bcgt").attr("fill", color[0]).attr("actual", function(d){ return d.value }).attr("year", function(d){ return +d.key})
                                    .attr("pred", function(d){ 
                                        if (predictionmod.filter(x => x.key === d.key).length > 0){
                                            return predictionmod.filter(x => x.key === d.key)[0].value;
                                        } else {
                                            return -999;
                                        }
                                    }),
                    exit => exit.remove()
                )
                .on("mouseover", tip.show)
                .on("mouseleave", tip.hide);
    
                svg.selectAll(".bcpred")
                .data(predictionmod)
                .join(
                    enter => enter.append("rect").attr("x", function(d){ return xScale(+d.key) + xScale.bandwidth()/ 2}).attr("y", function(d){ return yScale(d.value) })
                                    .attr("width", xScale.bandwidth() / 2).attr("height", function(d){ return height - yScale(d.value) - padding})
                                    .attr("class", "bcpred").attr("fill", color[1]).attr("pred", function(d){ return d.value }).attr("year", function(d){ return +d.key})
                                    .attr("actual", function(d){ 
                                        if (groundTruthmod.filter(x => x.key === d.key).length > 0){
                                            return groundTruthmod.filter(x => x.key === d.key)[0].value;
                                        } else {
                                            return -999;
                                        }
                                    }),
                    update => update.attr("x", function(d){ return xScale(+d.key) + xScale.bandwidth()/ 2}).attr("y", function(d){ return yScale(d.value) })
                                    .attr("width", xScale.bandwidth() / 2).attr("height", function(d){ return height - yScale(d.value) - padding})
                                    .attr("class", "bcpred").attr("fill", color[1]).attr("pred", function(d){ return d.value }).attr("year", function(d){ return +d.key})
                                    .attr("actual", function(d){ 
                                        if (groundTruthmod.filter(x => x.key === d.key).length > 0){
                                            return groundTruthmod.filter(x => x.key === d.key)[0].value;
                                        } else {
                                            return -999;
                                        }
                                    }),
                    exit => exit.remove()
                )
                .on("mouseover", tip.show)
                .on("mouseleave", tip.hide);  
                
                // Define axes
                var xAxis = d3.axisBottom()
                .scale(xScale);        

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

                // Create axes
                svg.select(".x-axis")
                .attr("transform", "translate(0," + (height - padding) + ")")
                .call(xAxis);

                svgyaxis.select(".y-axis")
                .attr("transform", "translate(" + (padding - 2) + ",0)")
                .call(yAxis);
            }
           

            // Axis labels
            svg.selectAll(".xaxislabel")
            .data([1])
            .join(
                enter => enter.append("text").attr("x", (width-padding)/2).attr("y", height - 5).attr("font-size", "12px")
                            .attr("font-weight", 700).attr("class", "xaxislabel").text("Year"),
                update => update.attr("x", (width-padding)/2).attr("y", height - 5).attr("font-size", "12px")
                            .attr("font-weight", 700).attr("class", "xaxislabel").text("Year"),
                exit => exit.remove()
            ) 

            svgyaxis.selectAll(".yaxislabel")
            .data([1])
            .join(
                enter => enter.append("text").attr("text-anchor", "middle").attr("font-size", "12px").attr("transform", "translate("+ (8) +","+(height/3)+")rotate(-90)")
                            .attr("font-weight", 700).attr("class", "yaxislabel").text("Stream Flow"),
                update => update.attr("text-anchor", "middle").attr("font-size", "12px").attr("transform", "translate("+ (8) +","+(height/3)+")rotate(-90)")
                            .attr("font-weight", 700).attr("class", "yaxislabel").text("Stream Flow"),
                exit => exit.remove()
            ) 

            // create legend
            var legenddata = ["Actual", "Prediction"];
            
            var legend = svglegend
                            .selectAll(".rectlegend")
                            .data(legenddata);
            legend.join(
                enter => enter.append("rect").attr('x', 5).attr('y', function(d, i) { return (i * 20) + 25}).attr('width', 10).attr('height', 10).attr("class", "rectlegend")
                            .style('fill', function(d, i){ return color[i]; }),
                update => update, 
                exit => exit.remove()
            );

            legend = svglegend
                    .selectAll(".legendlabel")
                    .data(legenddata);
            legend.join(
                enter => enter.append("text").attr('x', 20).attr('y', function(d, i) { return (i * 20) + 35}).text(function(d){ return d; }).attr("class", "legendlabel").attr("font-size", "10px"),
                update => update.text(function(d){ return d; }), 
                exit => exit.remove()
            );               
                
            // create title
            svg.selectAll(".plottitle").remove();

            svg.selectAll(".plottitle")
                .data([1])
                .join(
                    enter => enter.append("text").attr("x", (width - 2*padding) /2).attr("y", 20).attr("text-anchor", "middle")
                                .attr("font-weight", 700).attr("class", "plottitle").text("StreamFlow By Year for Station " + oneselectedStation)
                                .style("font-size", "18px").style("text-decoration", "underline"),
                    update => update.attr("x", (width - 2*padding) /2).attr("y", 20).attr("text-anchor", "middle")
                                .attr("font-weight", 700).style("font-size", "18px").style("text-decoration", "underline").attr("class", "plottitle")
                                .text("StreamFlow By Year for Station " + oneselectedStation),
                    exit => exit.remove()
                ); 
        }

    }, [selectedStation, oneselectedStation, selectedModels, selectedYear, groundTruth, prediction, currentDispModel]);


    return (
        <div>
            {props.selectedStationData?
            <div>
                <div id="barchart_container" style={{display: "block", position: "relative", top: "-50px", visibility: "hidden"}} />
                <div id="barchart">
                    <div style={{backgroundColor: "#62a5e7", color: "white", height: "50px"}}>
                            <h2 style={{marginTop: "10px", marginBottom: "10px", marginLeft: "20px"}}>BarChart for Yearly Streamflow Aggregation</h2>
                    </div>  
                    <FormControl style={{marginLeft: "20px", marginTop: "10px", marginBottom: "10px"}}>
                        <InputLabel shrink>Display Station BarChart: </InputLabel>
                        <NativeSelect onChange={(e) => setOneSelectedStation(e.target.value)} style={{width: "200px"}}>
                            {selectedStation.map(x => <option value={x} key={x}>{x}</option>)}
                        </NativeSelect>
                    </FormControl>
                    <FormControl style={{marginLeft: "20px", width: "200px", marginTop: "10px", marginBottom: "10px"}}>
                        <InputLabel shrink>Model to Display: </InputLabel>
                        <NativeSelect onChange={(e) => setCurrentDispModel(e.target.value)}>
                            <option value={"Average"} key={"Average"}>Average</option>
                            {selectedModels.map(x => <option value={x} key={x}>{x}</option>)}
                        </NativeSelect>
                    </FormControl>
                    <div style={{display: "flex", alignItems: "center", marginLeft: "20px"}}>
                        <svg ref={svgRefyAxis} width={padding} height={height}>
                            <g className="y-axis"></g>
                        </svg>
                        <svg ref={svgRef} width = {width} height = {height}>
                                <g className="x-axis"></g>
                        </svg>
                        <svg ref={legendRef} width = {padding * 2} height={height}>
                            <text x="10" y="10" fontWeight="700">Legend</text>
                            <g className="legendLinear"></g>
                        </svg>
                    </div>
                </div>
            </div>
            : null}
        </div>
    )
};

export default Barchart;