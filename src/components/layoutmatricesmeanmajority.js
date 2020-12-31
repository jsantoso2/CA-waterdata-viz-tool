import React, {useEffect, useState, useRef} from 'react';
import * as d3 from 'd3';
import * as d3Collection from 'd3-collection';


function LayoutMatricesMeanMajority(props) {
    // original parameters
    /*var sizeCells = 12;
    var heightMatrices = 12*sizeCells, widthMatrices = 31*sizeCells;
    var toolTip = d3.select('body').append('div').attr('class','tooltip').style('opacity', 0);
    var modelsTable = d3.select('body').append('div').attr('class','tableModel').style('opacity', 0);
    */

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

    const [stepmaj, setStepMaj] = useState(0.5);
    const [stepdiv, setStepDiv] = useState(0.5);


    // load matrices layout
    /*function loadMatricesLayout(groundTruth,predictions,selectedStation,selectedYear,selectedModels,mode,coloringScheme) {
        var predictionHeatMatricesDiv = d3.select('#predictionHeatMatricesDiv' + mode); //add unique id for divs

        predictionHeatMatricesDiv.selectAll("*").remove();
        
        //Creating SVG and Group for the matrix
        var predictionHeatMatricesSVG = predictionHeatMatricesDiv.append('svg').attr('id','predictionHeatMatricesSVG'+mode)
                                             .attr('height',(heightMatrices+sizeCells+10))
                                             .attr('width',(widthMatrices+sizeCells+10));
        var predictionHeatMatricesG = predictionHeatMatricesSVG.append('g').attr('id','predictionHeatMatricesG'+mode)
                                                       .attr('transform','translate(' + 0 + ',' + 10 + ')');
                
        var data = filterData(groundTruth,predictions,selectedStation,selectedYear,selectedModels,mode);	
        buildMatrix(data,coloringScheme,selectedModels,mode);        
    }


    // filter data based on selected year and models and mode
    function filterData(groundTruth,predictions,selectedStation,selectedYear,selectedModels,mode) {
        var temp = groundTruth.filter(function(d){return +d.date.getFullYear() === +selectedYear;});
        var realData = temp.map(function(d){return{date: d.date.toISOString().substring(0, 10),flow: +d.y};});
        // predictions filtered by model and year
        temp = predictions.filter(function(d){return (([+selectedYear].includes(+d.date.getFullYear()))&&(selectedModels.includes(d.model)));});

        var predictedData;
        switch (mode) {
            case 'avg':
                temp = d3Collection.nest().key(function(d){return d.date.toISOString().substring(0, 10);})
                                  .rollup(function(d){return d3.mean(d,function(d){return d.yhat;})})
                                  .entries(temp);
                // format: [{date: '2018-01-01', flow: 0.233}, {date: '2018-01-02', flow: 0.3333}, ....]
                predictedData = temp.map(function(d){return{date:d.key,flow:d.value};});
                break;
            case 'div':	
            case 'maj':
                temp = d3Collection.nest().key(function(d){return d.date.toISOString().substring(0, 10);})
                                  .entries(temp);
                // format: [{date: '2018-01-01', flow: 0.233, models: ["0", "1"]}, {date: '2018-01-02', flow: 0.3333, models: ["0"]}, ....]
                predictedData = temp.map(function(d,i){
                                            var allValuesPredictions = d.values.map(function(d){return {model:d.model,flow:+d.yhat};});
                                            var step = d3.select('#step').property('value');
                                            var majorityVotingData = getMajority(allValuesPredictions,+step);
                                            return{date:d.key,flow:majorityVotingData.mean,models:majorityVotingData.models};
                                          });
                break;
            default:
                console.log('Not implemented yet.');
                
        }

        return [realData,predictedData];
    }

    // get majority function
    function getMajority(dataset,step) {
        var minMax = d3.extent(dataset,function(d){return +d.flow});
        var range = [];
        var i = minMax[0];
        while (i<=minMax[1]) {
           range.push(i);
           i = i + step;
        }	
        var sQuantize = d3.scaleQuantize().domain(minMax).range(range);	
        var histogram = {};	
        dataset.forEach(function(d){
                            if (histogram[sQuantize(d.flow)] == null) {
                                histogram[sQuantize(d.flow)] = [];
                            }
                            histogram[sQuantize(d.flow)].push({model:d.model,flow:d.flow});
                        });
        var quants = [];
        for (var key in histogram)
            quants.push({name: key,value: histogram[key].length});
        quants.sort(function(a,b) {
            return (a.value < b.value) ? 1 : ((b.value < a.value) ? -1 : 0)
        });
        
        if (histogram[quants[0].name].length === 1) {//In this case, as the bin with the highest number of models has a single model, none of the models 'agreed', so we don´t have a majority voting at all. 
            var keys = Object.keys(histogram);
            var values = keys.map(function(v){return histogram[v];});
            var avg = d3.mean(values,function(d){return d[0].flow});
            return {mean:avg,models:[]};
        }else {
            var avg = d3.mean(histogram[quants[0].name],function(d){return d.flow});
            return {mean:avg,models:histogram[quants[0].name].map(function(d){return d.model})};
        }
    }


    // basic method to create range
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

    
    function buildMatrix(filteredData,coloringScheme,selectedModels,mode) {
        var minValue;
        var maxValue;
        
        var colorScale = d3.scaleLinear();
        // Question: what is this div mode??
        if (mode === 'div') {
            minValue = 1;
            maxValue = selectedModels.length;
            colorScale.domain([minValue,maxValue]);
            colorScale.range(['white','red']);
        }else 
            if (coloringScheme === 'absolute') {
                minValue = 0;
                maxValue = d3.max([d3.max(filteredData[0],function(d){return +d.flow;}),d3.max(filteredData[1],function(d){return +d.flow;})]);
                colorScale.domain([minValue,maxValue]);
                colorScale.range(['white','red']);
            }else if (coloringScheme === 'relative') {
                minValue = 0 - d3.max(filteredData[0],function(d){return +d.flow;});
                maxValue = d3.max(filteredData[1],function(d){return +d.flow;});
                colorScale.domain([minValue,0,maxValue]);
                colorScale.range(['blue','white','red']);
            }
                                         
        var format = d3.format(",.2f");
        
        var waterYearStart = '01-01';
        var months = createRange(+waterYearStart.split('-')[0],12,+waterYearStart.split('-')[0]-1);
        var days = createRange(+waterYearStart.split('-')[1],31,+waterYearStart.split('-')[1]-1);
    
        var realByMonth = d3Collection.nest().key(function(d) {return d.date.split('-')[1];}).entries(filteredData[0]);
        var predictionByMonth = d3Collection.nest().key(function(d) {return d.date.split('-')[1];}).entries(filteredData[1]);
        
        //Cleaning previously created matrices
        var predictionHeatMatricesG = d3.select('#predictionHeatMatricesG'+mode);
        predictionHeatMatricesG.selectAll("*").remove();
        
        months.forEach(function(month,i) {
            var realDays = realByMonth.filter(function(d){return +d.key === month});
            var predictionDays = predictionByMonth.filter(function(d){return +d.key === month});
            if ((realDays[0] !== null)&&(realDays[0].values !== null)&&(realDays[0].values.length !== 0)&&(predictionDays[0] !== null)&&(predictionDays[0].values !== null)&&(predictionDays[0].values.length !== 0)&&(realDays[0].values.length === predictionDays[0].values.length)) {
                predictionHeatMatricesG.append('text').text(month).attr('x',0).attr('y',i*sizeCells+11).attr('class','label');
                days.forEach(function(day,j){
                    var rect = predictionHeatMatricesG.append('rect').attr('x',(j+1)*sizeCells).attr('y',i*sizeCells)
                                    .attr('width',sizeCells).attr('height',sizeCells)
                                    .on('mouseout', function(d) {
                                        d3.select(this).style('stroke','none');
                                        toolTip.style('opacity', .0);
                                        modelsTable.style('opacity',0);
                                    });
                    var realDayData = realDays[0].values.filter(function(d){return +d.date.split('-')[2] === day;});
                    var predictionDayData = predictionDays[0].values.filter(function(d){return +d.date.split('-')[2] === day;});
                    if (realDayData.length !== 0) {
                        var dif;
                        if (mode ==='div') {
                            dif = predictionDayData[0].models.length;
                        }else {
                            dif = predictionDayData[0].flow - realDayData[0].flow;
                            if (coloringScheme === 'absolute') dif = Math.abs(dif);
                        }
                        rect.attr('id',realDayData[0].date)
                            .attr('value',dif)
                            .attr('fill',colorScale(dif))
                            .on('mouseover', function(d) {
                                d3.select(this).style('stroke','black');
                                toolTip.style('opacity', .9);
                                var numberLines = 0;
                                switch (mode) {
                                    case 'avg':
                                        var tooltipMessage = d3.select(this).attr('id')+'<br>'+format(d3.select(this).attr('value'));
                                        break;
                                    case 'maj':
                                        var tooltipMessage = d3.select(this).attr('id')+'<br>'+format(d3.select(this).attr('value'));
                                        var models = d3.select(this).attr('models');
                                        if (models != null) {
                                            modelsTable.style('opacity',1);
                                            var selectedModels = models.split(',').sort(function(a,b){return (+a > +b)?1:((+b > +a)?-1:0)});
                                            if (selectedModels.length <= 1) {
                                                tooltipMessage = tooltipMessage + '(Average)';
                                                var htmlModels = 'No majority voting <br>';
                                                numberLines++;
                                            } else {
                                                tooltipMessage = tooltipMessage + '('+selectedModels.length+'/'+selectedModels.length+' models)';
                                                var htmlModels = 'Models: <br>';
                                                var numberLines = 0;
                                                for (i=0;i<selectedModels.length-1;i++) {
                                                    htmlModels += selectedModels[i]+',';
                                                    if ((i!== 0)&&(i%4)===0) {
                                                        htmlModels += '<br>';
                                                        numberLines++;
                                                    }
                                                }
                                                htmlModels += selectedModels[selectedModels.length-1];
                                            }
                                            modelsTable.html(htmlModels).style('left',520+'px').style('top',30+'px').style('width',105+'px').style('height',(numberLines+3)*13+'px');
                                        }
                                        break;
                                    case 'div':
                                        var tooltipMessage = d3.select(this).attr('id')+'<br>';
                                        var models = d3.select(this).attr('models');
                                        if (models != null) {
                                            modelsTable.style('opacity',1);
                                            var selectedModels = models.split(',').sort(function(a,b){return (+a > +b)?1:((+b > +a)?-1:0)});
                                            var htmlModels;
                                            tooltipMessage = tooltipMessage + selectedModels.length+'/'+selectedModels.length+' models';
                                            if (selectedModels.length <= 1) {
                                                htmlModels = 'No agreement.';
                                                numberLines++;
                                            } else {
                                                htmlModels = 'Models: <br>';
                                                var numberLines = 0;
                                                for (i=0;i<selectedModels.length-1;i++) {
                                                    htmlModels += selectedModels[i]+',';
                                                    if ((i !== 0)&&(i%4) === 0) {
                                                        htmlModels += '<br>';
                                                        numberLines++;
                                                    }
                                                }
                                                htmlModels += selectedModels[selectedModels.length-1];
                                            }
                                            modelsTable.html(htmlModels).style('left',520+'px').style('top',30+'px').style('width',105+'px').style('height',(numberLines+3)*13+'px');
                                        }
                                        break;
                                    default:
                                        console.log("Not Implemented Error");
                                }
                                toolTip.html(tooltipMessage)	
                                .style('left', d.x+5 + 'px')
                                .style('top', d.y+1400 + 'px'); // offset
                                })
                        var models = predictionDayData[0].models;
                        if (models != null) {
                            rect.attr('models',models);
                        }
                    }else {
                        rect.attr('id','None_'+j).attr('station','none').attr('value','null').attr('fill','white').style('stroke','none')
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
        days.forEach(function(day,j){
                predictionHeatMatricesG.append('text').text(j+1).attr('x',(j+1)*sizeCells+5).attr('y',12*sizeCells+11).attr('class','label');
        });
    }*/
    

    useEffect(() => {
        // ...D3 code
        // loadMatricesLayout(groundTruth,predictions,selectedStation,selectedYear,selectedModels,mode,coloringScheme);
    }, [selectedStation, oneselectedStation, selectedModels, selectedYear, oneselectedYear, groundTruth, prediction]);

    return (
        <div>
            {props.selectedStationData ?
            <div></div>
            : null}
        </div>
    )
}

export default LayoutMatricesMeanMajority;



/*
            {mode === "avg" ?
                <div>
                    <h3>AVG</h3>
                    <div id="predictionHeatMatricesDivavg" style={{height: (heightMatrices+sizeCells+10)+"px", maxWidth: (widthMatrices+sizeCells+10)+"px"}}>
                    </div>
                </div>
            : mode === "maj" ?
                <div>
                    <h3>Maj</h3>
                    <input id="step" type="number" step="0.1" min="0" max="10" value={stepmaj} onChange={(e) => setStepMaj(e.target.value)}></input>
                    <div id="predictionHeatMatricesDivmaj" style={{height: (heightMatrices+sizeCells+10)+"px", maxWidth: (widthMatrices+sizeCells+10)+"px"}}>
                    </div>
                </div>
            : 
                <div>
                    <h3>div</h3>
                    <input id="step" type="number" step="0.1" min="0" max="10" value={stepdiv} onChange={(e) => setStepDiv(e.target.value)}></input>
                    <div id="predictionHeatMatricesDivdiv" style={{height: (heightMatrices+sizeCells+10)+"px", maxWidth: (widthMatrices+sizeCells+10)+"px"}}>
                    </div>
                </div>
            }
*/