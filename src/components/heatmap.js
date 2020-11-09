import React, {useRef, useState, useEffect} from 'react';
import * as d3 from 'd3';
import * as d3Collection from 'd3-collection';
import { FormControl, FormHelperText, NativeSelect, InputLabel } from '@material-ui/core';
import { text } from 'd3';


function Heatmap(props) {

    const svgRef = useRef();

    // constants for svg properties
    const height = 500;
    const width = 500;
    const padding = 40;
    const sizeCells = 3;

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

        if (typeof prediction !== "undefined" && typeof groundTruth !== "undefined"){
            svg.selectAll(".matrixsq").remove();
            svg.selectAll(".xlabel").remove();
            
            var xdata = [];
            var ydata = [];
            // DATA filtering
            // xdata
            if (selectedX === "Actual"){
                //console.log("selecteeXYear", selectedXYear);
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
                        .rollup(function(v){ return d3.sum(v, function(d){ return d.y; }); })
                        .entries(xdata);

                ydata = d3Collection.nest().key(function(d){ return d.week; })
                                .rollup(function(v){ return d3.sum(v, function(d){ return d.y; }); })
                                .entries(ydata);
            } else {
                xdata = d3Collection.nest().key(function(d){ return d.month; })
                                .rollup(function(v){ return d3.sum(v, function(d){ return d.y; }); })
                                .entries(xdata);

                ydata = d3Collection.nest().key(function(d){ return d.month; })
                                .rollup(function(v){ return d3.sum(v, function(d){ return d.y; }); })
                                .entries(ydata);
            }
    
            // console.log("xdata", xdata);
            // console.log("ydata", ydata);

            // double for loop for iteration
            var matrixdata = [];
            xdata.forEach((x, i) => {
                ydata.forEach((y, i2) => {
                    matrixdata.push({ix: i, iy: i2, valx: +x.key, valy: +y.key, value: x.value - y.value})
                })
            }); 

            // console.log("matrixdata", matrixdata);
            
            var xdomain = matrixdata.map(x => x.ix);
            var ydomain = matrixdata.map(x => x.iy);

            // BuildScales:
            var xScale = d3.scaleBand()
                            .domain(xdomain)
                            .range([padding, width - padding]);
            
            var yScale = d3.scaleBand()
                            .domain(ydomain)
                            .range([height-padding, padding]);
            
            var colorscale = d3.scaleLinear()
                               .domain([0, d3.max(matrixdata, function(d){ return Math.abs(d.value); })])
                               .range(["white", "blue"]);

            // add the squares
            svg.selectAll(".matrixsq")
                .data(matrixdata)
                .enter()
                .append("rect")
                .attr("x", function(d){ return xScale(d.ix)})
                .attr("y", function(d){ return yScale(d.iy)})
                .attr("width", xScale.bandwidth())
                .attr("height", yScale.bandwidth())
                .style("fill", function(d) { return colorscale(d.value)})
                .attr("class", "matrixsq");

            svg.selectAll(".xlabel")
                .data(matrixdata)
                .append("text")
                .attr("x", function(d){ return xScale(d.ix); })
                .attr("y", 100)
                .text(function(d){ return d.valx})
                .attr("class", "xlabel");
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
        <div>
            <FormControl>
                <InputLabel shrink>Aggregation: </InputLabel>
                <NativeSelect onChange={(e) => setAggregation(e.target.value)}>
                    {aggregationdata.map(x => <option value={x} key={x}>{x}</option>)}
                </NativeSelect>
            </FormControl>
            <p>XAxis</p>
            <FormControl>
                <InputLabel shrink>Model: </InputLabel>
                <NativeSelect onChange={(e) => handleSelectedX(e)}>
                    {selectOptions.map(x => <option value={x} key={x}>{x}</option>)}
                </NativeSelect>
            </FormControl>
            <FormControl>
                <InputLabel shrink>Year: </InputLabel>
                <NativeSelect onChange={(e) => setSelectedXYear(e.target.value)} value={selectedXYear}>
                    {selectedXList.map(x => <option value={x} key={x}>{x}</option>)}
                </NativeSelect>
            </FormControl>
            <p>YAxis</p>
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
            <svg ref={svgRef} width = {width} height = {height}>
                <g className="y-axis"></g>
                <g className="x-axis"></g>
            </svg>
        </div>
    )
}

export default Heatmap;
