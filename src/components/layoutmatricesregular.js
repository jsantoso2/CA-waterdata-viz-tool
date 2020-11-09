import React, {useEffect} from 'react';
import * as d3 from 'd3';
import * as d3Collection from 'd3-collection';
import './styles.css';


function LayoutMatricesRegular(props) {
    // original parameters
    var sizeCells = 12;
    var heightMatrices = 12*sizeCells, widthMatrices = 31*sizeCells;
    var toolTip = d3.select('body').append('div').attr('class','tooltip').style('opacity', 0);

    // passed properties
    var selectedStation = props.selectedStation;
    var selectedYear = props.selectedYear;
    var selectedModels = props.selectedModels;
    var coloringScheme = props.coloringScheme;
    var accuracyOrdering = props.accuracyOrdering;
    var localRangeValues = props.localRangeValues;
    var columnValue = props.columnValue;
    var groundTruth = props.groundTruth;
    var predictions = props.prediction;

    // load matrices layout
    const loadMatricesLayout = (groundTruth,predictions,selectedStation,selectedYear,selectedModels,columnValue,coloringScheme,accuracyOrdering,localRangeValues) => {        
        var min = 0 - d3.max(groundTruth,function(d){return +d.Streamflow;});
        var max = d3.max(predictions,function(d){return +d.yhat;});
        
        var predictionHeatMatricesDiv = d3.select('#predictionHeatMatricesDiv');
        
        // //If there is already a div, we use it. Otherwise, we create a new one.	
        // if (predictionHeatMatricesDiv.empty()) {
        //     predictionHeatMatricesDiv = d3.select('body').append('div')
        //     .attr('id','predictionHeatMatricesDiv').attr('class','layout')
        //     .style('style','height:'+(heightMatrices+sizeCells+10)+'px;max-width:'+(widthMatrices+sizeCells+10)+'px;')
        // }
        predictionHeatMatricesDiv.selectAll("*").remove();

        // Creating table to accommodate the matrices
        var matricesTable = predictionHeatMatricesDiv.append('table').attr('id','matricesTable');
        var row;
        var orderedModelList = [];
        
        // filter and order data
        selectedModels.forEach(function(model,i) {
            var data = filterData(groundTruth,predictions,selectedStation,selectedYear,model);
            var measure = i;
            if (accuracyOrdering === 'mae')
                measure = getMAE(data);
            else if (accuracyOrdering === 'rmse')
                measure = getRMSE(data);
                
            orderedModelList.push({model:model,m:measure,data:data});
            orderedModelList.sort(function(a,b) {return +a.m - +b.m;});
        });
        
        orderedModelList.forEach(function(d,i) {
            //Creating SVG and Group for the matrix
            if ((i%columnValue)===0) row = matricesTable.append('tr');
            var col = row.append('td');			
            var predictionHeatMatricesSVG = col.append('svg').attr('id','matrix'+d.model+'SVG')
                                                .attr('height',((heightMatrices+sizeCells+6)))
                                                .attr('width',(widthMatrices+sizeCells));
            var matrixTooltip = d3.select('body').append('div').attr('id','tooltip'+d.model).attr('class','tooltip').style('opacity', 0);
            var predictionHeatMatricesG = predictionHeatMatricesSVG.append('g').attr('id','matrix'+d.model+'G')
                                                        .attr('transform','translate(' + 0 + ',' + 0 + ')');
            buildMatrix(d.data,d.model,coloringScheme,localRangeValues,min,max);
        });
    }

    // get error metrics mae
    const getMAE = (data) => {
        var mae = 0;
        if (data[1].length > 0) {
            data[1].forEach(function(d,i) {return mae += Math.abs(d.flow - data[0][i].flow);});
            return mae/data[1].length;
        }else
            return NaN;
    }

    // get error metrics mse
    const getRMSE = (data) => {
        var rmse = 0;
        if (data[1].length > 0) {
            data[1].forEach(function(d,i) {return rmse += Math.pow(d.flow - data[0][i].flow,2);});
            return Math.sqrt(rmse/data[1].length);
        }else
            return NaN;
    }
    
    // get predicted data based on selected model and year
    const filterData = (groundTruth,predictions,selectedStation,selectedYear,model) => {
        var temp = groundTruth.filter(function(d){return +d.date.getFullYear() === +selectedYear;});
        var realData = temp.map(function(d){return{date: d.date.toISOString().substring(0, 10) ,flow: d.y};});
        temp = predictions.filter(function(d){return ((+d.date.getFullYear() === +selectedYear)&&(d.model === model));});
        var predictedData = temp.map(function(d){return{date:d.date.toISOString().substring(0, 10) , flow:d.yhat, model:d.model};});
        return [realData,predictedData];
    }

    const createRange = (start,circle,end) => {
        var ret = [];
        var i = start;
        while (i <= circle) {
            ret.push(i);
            i++;		
        }
        i = 1;
        while (i <= end) {
            ret.push(i);
            i++;		
        }
        return ret;
    }
    

    // build matrix method
    const buildMatrix = (filteredData,model,coloring,localRange,min,max) => {
        var container = d3.select('#matrix'+model+'G');
        //var containerSVG = d3.select('#matrix'+model+'SVG');
        var colorScale = d3.scaleLinear();
        var minValue = min;
        var maxValue = max;
        // color scheme 
        if (coloring === 'absolute') {
            if (localRange)
                maxValue = d3.max([d3.max(filteredData[0],function(d){return +d.flow;}),d3.max(filteredData[1],function(d){return +d.flow;})]);
            else
                maxValue = d3.max([minValue,maxValue]);
            minValue = 0;
            colorScale.domain([minValue,maxValue]);
            colorScale.range(['white','red']);
        }else if (coloring === 'relative') {
            if (localRange) {
                minValue = 0 - d3.max(filteredData[0],function(d){return +d.flow;});
                maxValue = d3.max(filteredData[1],function(d){return +d.flow;});
            }
            colorScale.domain([minValue,0,maxValue]);
            colorScale.range(['blue','white','red']);
        }
                                 
        var format = d3.format(",.2f");
        
        var waterYearStart = '01-01';
        var months = createRange(parseFloat(waterYearStart.split('-')[0]),12,parseFloat(waterYearStart.split('-')[0]-1));
        var days = createRange(parseFloat(waterYearStart.split('-')[1]),31,parseFloat(waterYearStart.split('-')[1]-1));

        // format: [{key: "01", values: [xxxxx]}, {key: "02", values:[xxxx], .....}]
        var realByMonth = d3Collection.nest().key(function(d) {return d.date.split('-')[1];}).entries(filteredData[0]);
        var predictionByMonth = d3Collection.nest().key(function(d) {return d.date.split('-')[1];}).entries(filteredData[1]);

        months.forEach(function(month,i) {
            var realDays = realByMonth.filter(function(d){return parseFloat(d.key) === parseFloat(month)});
            var predictionDays = predictionByMonth.filter(function(d){return parseFloat(d.key) === parseFloat(month)});
            if ((realDays[0] !== null)&&(realDays[0].values !== null)&&(realDays[0].values.length !== 0)&&(predictionDays[0] !== null)&&(predictionDays[0].values !== null)&&(predictionDays[0].values.length !== 0)&&(realDays[0].values.length === predictionDays[0].values.length)) {
                days.forEach(function(day,j){
                    var rect = container.append('rect').attr('x',(j+1)*sizeCells).attr('y',i*sizeCells)
                                    .attr('width',sizeCells).attr('height',sizeCells).style('stroke','none');
                    var realDayData = realDays[0].values.filter(function(d){return +d.date.split('-')[2] === day;});
                    var predictionDayData = predictionDays[0].values.filter(function(d){return +d.date.split('-')[2] === day;});
                    if (realDayData.length !== 0) {
                        var dif = predictionDayData[0].flow - realDayData[0].flow;
                        if (coloring === 'absolute') dif = Math.abs(dif);
                        rect.attr('id','rect-'+realDayData[0].date)
                            .attr('date',realDayData[0].date)
                            .attr('value',dif)
                            .attr('model',model)
                            .attr('fill',colorScale(dif))
                            .on('mouseout', function(d) {
                                var date = d3.select(this).attr('date').split('-');
                                var rects = d3.selectAll("rect[id$='"+date[1]+"-"+date[2]+"']");
                                rects.style('stroke','none');
                                rects.each(function(d){
                                    var tooltipMatrix = d3.select('#tooltip'+d3.select(this).attr('model'));
                                    tooltipMatrix.style('opacity', .0);
                                });
                            })
                            .on('mouseover', function(d) {
                                var date = d3.select(this).attr('date').split('-');
                                var rects = d3.selectAll("rect[id$='"+date[1]+"-"+date[2]+"']");
                                rects.style('stroke','black');
                                rects.each(function(d){
                                        var x = d3.select(this).node().getBoundingClientRect().x + 5;
                                        var y = d3.select(this).node().getBoundingClientRect().y + 1700; // need to add svg height
                                        var tooltipMatrix = d3.select('#tooltip'+d3.select(this).attr('model'));
                                        tooltipMatrix.style('opacity', .9).style('left',x+'px').style('top',y+'px');
                                        tooltipMatrix.html(d3.select(this).attr('date')+'<br>'+format(d3.select(this).attr('value')));
                                    });
                                });
                    } else {
                        rect.attr('id','None_'+j)
                            .attr('date','null')
                            .attr('value','null')
                            .attr('station','none')
                            .attr('fill','white')
                            .on('mouseout', function(d) {
                                toolTip.style('opacity', .0);
                            })
                            .on('mouseover', function(d) {
                                toolTip.style('opacity', .9);
                                toolTip.html('No info')	
                                .style('left', (d.x+5) + 'px')
                                .style('top', (d.y-15) + 'px');	
                                })
                    }
                });
            }
        });
        container.append('text').text('Model '+model).attr('x',sizeCells+5).attr('y',12*sizeCells+11).attr('class','label');
    }
    

    // render depends on all parameters
    useEffect(() => {
        // ...D3 code
        loadMatricesLayout(groundTruth,predictions,selectedStation,selectedYear,selectedModels,columnValue,coloringScheme,accuracyOrdering,localRangeValues);

    }, [selectedStation, selectedYear, selectedModels, coloringScheme, accuracyOrdering, localRangeValues, columnValue]);

    return (
        <div id="predictionHeatMatricesDiv" className="layout" style={{height: heightMatrices+sizeCells+10+"px", maxWidth: (widthMatrices+sizeCells+10)+"px"}}>
        </div>
    )
}


export default LayoutMatricesRegular;