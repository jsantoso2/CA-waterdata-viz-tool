import React, {useEffect, useState, useRef} from 'react';
import * as d3 from 'd3';
import d3Tip from "d3-tip";
import { FormControl, NativeSelect, InputLabel } from '@material-ui/core';


function LayoutMatricesRegular(props) {
    // original parameters
    var width = 400;
    var height = 200;
    var padding = 20;

    const tabRef = useRef();
    const tabrefvar = d3.select(tabRef.current);

    // passed properties
    var selectedStation = props.selectedStation;
    const [oneselectedStation, setOneSelectedStation] = useState(props.selectedStation[0]);    
    var selectedModels = props.selectedModels; 
    
    var selectedYear = props.selectedYear;    // [1979, 2019];

    var prediction;
    var groundTruth;
    if (props.selectedStationData.length > 1) {
        prediction = props.selectedStationData.filter(x => +x[2] === +oneselectedStation)[0][0];
        groundTruth = props.selectedStationData.filter(x => +x[2] === +oneselectedStation)[0][1];
    } else {
        prediction = props.selectedStationData[0][0];
        groundTruth = props.selectedStationData[0][1];
    }

    var selectedYearList = [...new Set(prediction.map(x => x.date.getFullYear()))];
    selectedYearList = Array.from(selectedYearList).sort();

    const [oneselectedYear, setOneSelectedYear] = useState(selectedYearList[0]);
    var columnValue = 4;

    // build matrix method
    const buildMatrix = (filteredData,model, i) => {
        const svg = d3.select(tabRef.current).select("#row" + Math.floor(i/columnValue)).select('#matrix'+i+'SVG')

        var matrixdata = [];
        // filteredData=[realData, predictedData]
        filteredData[0].forEach((x, i) => {
            matrixdata.push({ix: +x.date.split("-")[2], iy: +x.date.split("-")[1], pred: +filteredData[1][i].flow, real: +x.flow, diff: Math.abs(+filteredData[1][i].flow - +x.flow)});
        });
        
        console.log("matrixData", matrixdata);

        var xdomain = matrixdata.map(x => x.ix);
        var ydomain = matrixdata.map(x => x.iy);
        xdomain = [...new Set(xdomain)];
        ydomain = [...new Set(ydomain)];
        var validvalues = matrixdata.filter(x => x.pred != -999 && x.flow != -999);

        // BuildScales:
        var xScale = d3.scaleBand()
                    .domain(xdomain)
                    .range([padding, width]);
    
        var yScale = d3.scaleBand()
                        .domain(ydomain)
                        .range([0, height - padding]);
        
        var colorscale = d3.scaleLinear()
                        .domain([0, d3.max(validvalues, function(d){ return +d.diff; })])
                        .range(["white", "blue"]);
        
        // tooltip
        var tip = d3Tip()
                    .attr("visible", "visible")
                    .attr('class', 'd3-tip')
                    .offset([-10, 0])
                    .html(function(d) {
                            return "<strong style='color:white'><span style='color:white'>" + d3.select(this).attr("daymonth") + "</span></strong>"
                            + "<br/>" + "<span style='color:white'>Actual: "  + Math.round(d3.select(this).attr("real"))
                            + "<br/>" + "<span style='color:white'>Prediction: "  + Math.round(d3.select(this).attr("pred"))
                            + "<br/>" + "<span style='color:white'>Difference: "  + Math.round(d3.select(this).attr("diff"));  
                    })
                    .style("background-color", "black");
        svg.call(tip);

        // add the squares
        svg.selectAll(".matrixsq")
            .data(matrixdata)
            .enter()
            .append("rect")
            .attr("x", function(d){ return xScale(d.ix)})
            .attr("y", function(d){ return yScale(d.iy)})
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .style("fill", function(d) { 
                if (d.pred != -999 && d.real != -999){
                    return colorscale(d.diff);
                } else {
                    return "black";
                }})
            .attr("pred", function(d){ return d.pred})
            .attr("real", function(d){ return d.real})
            .attr("diff", function(d) { return d.diff})
            .attr("daymonth", function(d){ return "Month " + d.ix + " Day " + d.iy})
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("class", "matrixsq")
            .on("mouseover", tip.show)
            .on("mouseleave", tip.hide);
        
        // labels
        svg.selectAll(".xlabel")
            .data(xdomain)
            .join(
                enter => enter.append("text").attr("font-size", "8px").attr("x", function(d){ return xScale(d) + xScale.bandwidth()/2})
                            .attr("y", height - padding/2).attr("class", "xlabel").text(function(d){ return d}).attr("text-anchor", "middle"),
                update => update.attr("font-size", "8px").attr("x", function(d){ return xScale(d) + xScale.bandwidth()/2})
                            .attr("y", height - padding/2).attr("class", "xlabel").text(function(d){ return d}).attr("text-anchor", "middle"),
                exit => exit.remove()
            ); 
        
        svg.selectAll(".ylabel")
            .data(ydomain)
            .join(
                enter => enter.append("text").attr("font-size", "8px").attr("x", padding/1.5).attr("text-anchor", "middle")
                            .attr("y", function(d){ return yScale(d) + yScale.bandwidth()/2}).attr("class", "ylabel").text(function(d){ return d}),
                update => update.attr("font-size", "8px").attr("x", padding/1.5).attr("text-anchor", "middle")
                        .attr("y", function(d){ return yScale(d) + yScale.bandwidth()/2}).attr("class", "ylabel").text(function(d){ return d}),
                exit => exit.remove()
        );
    }
    


    // get predicted data based on selected model and year
    const filterData = (groundTruth,prediction,oneselectedYear,model) => {
        var temp = groundTruth.filter(function(d){return +d.date.getFullYear() === +oneselectedYear;});
        var realData = temp.map(function(d){
            if (isNaN(d.y) || d.y === null){
                return{date: d.date.toISOString().substring(0, 10), flow: d.ae};
            } else {
                return{date: d.date.toISOString().substring(0, 10), flow: d.y};
            }
        });
        temp = prediction.filter(function(d){return ((+d.date.getFullYear() === +oneselectedYear)&&(d.model === model));});
        var predictedData = temp.map(function(d){return{date:d.date.toISOString().substring(0, 10), flow:d.yhat, model:d.model};});

        // handle missing values for prediction
        var curruniqdays = [...new Set(predictedData.map(x => x.date))];
        var missingdays = [];
        if (curruniqdays !== realData.length){
            var curralldays = predictedData.map(x => x.date);
            realData.forEach(x => {
                if (curralldays.indexOf(x.date) === -1){
                    missingdays.push(x.date)
                }
            })
        }
        missingdays.forEach(d => {
            predictedData.push({
                date: d, flow: -999, model: model
            })
        });

        // sorting
        predictedData = predictedData.sort((a, b) => (a.date > b.date) ? 1 : -1);
        realData = realData.sort((a, b) => (a.date > b.date) ? 1 : -1);
        return [realData,predictedData];
    }

    // render depends on all parameters
    useEffect(() => {
        // if (props.selectedStationData.length === 1) {
        //     setOneSelectedStation(selectedStation[0]);
        //     setOneSelectedYear(selectedYearList[0]);
        // }

        // ...D3 code
        // remove all predline from previous draws
        tabrefvar.selectAll('.matrixsq').remove();
        tabrefvar.selectAll("tr").remove();

        var orderedModelList = [];
        selectedModels.forEach(function(model,i) {
            var data = filterData(groundTruth,prediction,oneselectedYear,model);
            orderedModelList.push({model:model,data:data});
        });

        console.log("orderedModelList", orderedModelList);

        orderedModelList.forEach(function(d,i) {
            //Creating SVG and Group for the matrix
            var row;
            var col;
            if ((i % columnValue)===0){
                row = tabrefvar.append('tr').attr("id", "row" + Math.floor(i/columnValue));
            }
            col = tabrefvar.select("#row" + Math.floor(i/columnValue)).append('td');
            col.append('p').text(d.model).style("font-size", "12px").style("margin-left", "20px").style("font-weight", 700);	
            col.append('svg').attr('id','matrix'+i+'SVG')
                .attr('height', height)
                .attr('width', width);
            buildMatrix(d.data,d.model, i);
        });
    }, [selectedStation, oneselectedStation, selectedModels, selectedYear, oneselectedYear, groundTruth, prediction]);

    return (
        <div>
        {props.selectedStationData ?
            (props.selectedModels.length > 0 && props.selectedModels.length < columnValue) ?
                <div>
                    <FormControl style={{marginLeft: "20px", marginTop: "10px", marginBottom: "10px"}}>
                        <InputLabel shrink>Display Station Heatmap: </InputLabel>
                        <NativeSelect onChange={(e) => setOneSelectedStation(e.target.value)} style={{width: "200px"}}>
                            {selectedStation.map(x => <option value={x} key={x}>{x}</option>)}
                        </NativeSelect>
                    </FormControl>
                    <FormControl style={{marginLeft: "20px", width: "200px", marginTop: "10px", marginBottom: "10px"}}>
                        <InputLabel shrink>Display Year Heatmap: </InputLabel>
                        <NativeSelect onChange={(e) => setOneSelectedYear(e.target.value)}>
                            {selectedYearList.map(x => <option value={x} key={x}>{x}</option>)}
                        </NativeSelect>
                    </FormControl>
                    <div id="predictionHeatMatricesDiv">
                        <h3 style={{marginLeft: "20px"}}>{"Various Model Prediction for Station " + oneselectedStation + " for Year " + oneselectedYear}</h3>
                        <table id="matricesTable" ref={tabRef}>
                        </table>
                    </div>
                </div>
            : <p style={{marginLeft: "20px", marginTop: "10px", marginBottom: "10px"}}>Please Select Models or Limit Model Selection to 4 Models Only!</p>
        : null}
        </div>
    )
}


export default LayoutMatricesRegular;