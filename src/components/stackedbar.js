import React, {useState, useEffect} from 'react';
import Plot from 'react-plotly.js';

function Stackedbar(props) {

    // color for different models
    var color = ["red", "yellow", "green", "orange", "purple"];

    // passed properties
    var selectedStation = props.selectedStation;
    var selectedModels = props.selectedModels; 
    var selectedYear = props.selectedYear; // [1979, 2019];
    var prediction = props.prediction; 
    var groundTruth = props.groundTruth; 

    var groupedgroundTruth = [];
    var groupedprediction = [];
    var barchartdata = [];

    if (typeof prediction !== 'undefined' && typeof groundTruth !== 'undefined'){
        // filter based on year and model
        prediction = prediction.filter(x => selectedModels.includes(x.model));
        groundTruth = groundTruth.filter(x => x.date.getFullYear() >= selectedYear[0] && x.date.getFullYear() <= selectedYear[1]);
        prediction = prediction.filter(x => x.date.getFullYear() >= selectedYear[0] && x.date.getFullYear() <= selectedYear[1]);

        // group by year
        groupedgroundTruth = [...groundTruth.reduce((r, o) => {
            const key = o.date.getFullYear();
            const item = r.get(key) || Object.assign({}, o, {
                y: 0
            });
            item.y += o.y;
            return r.set(key, item);
        }, new Map).values()];

        // create year key
        groupedgroundTruth = groupedgroundTruth.map(function(e) {
                var o = Object.assign({}, e);
                o.year = e.date.getFullYear();
                return o;
        });

        console.log("prediction", prediction);
        // for prediction
        selectedModels.forEach(model => {
            var temp = prediction.filter(x => x.model === model);
            temp = [...temp.reduce((r, o) => {
                const key = o.date.getFullYear();
                const item = r.get(key) || Object.assign({}, o, {
                    yhat: 0
                });
                item.yhat += o.yhat;
                return r.set(key, item);
            }, new Map).values()];
             // create year key
            temp = temp.map(function(e) {
                    var o = Object.assign({}, e);
                    o.year = e.date.getFullYear();
                    return o;
            });
            groupedprediction.push(temp);
        });


        barchartdata = [{type: 'bar', x: groupedgroundTruth.map(x => x.year), y: groupedgroundTruth.map(x => x.y), 
            hovertemplate: 'StreamFlow: %{y:.0f}<extra></extra>', marker: {color: "blue"}, name: "Actual"}]
        
        if (groupedprediction.length > 0){
            groupedprediction.forEach((p, i) => {
                barchartdata.push({type: 'bar', x: p.map(x => x.year), y: p.map(x => x.yhat), 
                hovertemplate: p.map(x => x.model)[0]+': %{y:.0f}<extra></extra>', marker: {color: color[i]}, name: p.map(x => x.model)[0] })
            })
        }
    }


    /*useEffect(() => {
        if (typeof prediction !== 'undefined' && typeof groundTruth !== 'undefined'){
        }
    }, [selectedStation, selectedYear, prediction, groundTruth])  // Maybe selected Models?*/
    

    return (
        <div >
            {groupedgroundTruth.length > 0 ?
                <div style={{height: "500px", width: "800px"}}>
                    <Plot data={barchartdata}
                        layout={ {title: '<b>Streamflow by Year</b>', titlefont: {"size": 20}, xaxis:{title: "Year", showgrid: false}, 
                                  yaxis:{title: "StreamFlow", showgrid: false }, width: "800px", height: "400px"} } />
                </div>
            : null}
        </div>
    )
}

export default Stackedbar;
