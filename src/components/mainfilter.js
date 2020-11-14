import React, {useState, useEffect} from 'react';
import * as d3 from 'd3';
import ReactMapGL, {Marker, Popup} from 'react-map-gl';
import LayoutMatricesRegular from './layoutmatricesregular';
import LayoutMatricesMeanMajority from './layoutmatricesmeanmajority';
import Stackedbar from './stackedbar';
import LinechartMultiple from './linechartmultiple';
import Heatmap from './heatmap';

// import styles and Material UI
import './mainfilter.css';
import './styles.css';
import { Grid, Checkbox, FormControlLabel, Button, FormControl, Select, InputLabel, FormHelperText, NativeSelect, Slider, Typography, Input } from '@material-ui/core';
import redcircle from '../redcircle.png';
import redrect from '../redrectangle.png';
import yellowcircle from '../yellowcircle.png';
import { select } from 'd3';


function Mainfilter() {
    // MAPBOX API TOKEN
    var mapboxapitoken = "pk.eyJ1IjoianNhbnRvc28yIiwiYSI6ImNrZ3NxYmc0MjBydXgyeXAyZTdoa2U1NXoifQ.Kb508UG3LtW2dakyxJj2eA";

    // code parameters
    var numCols = [4,5,6,7,8,9];
    var accuracyMeasures = [{n:'None',v:'none'},{n:'Root mean squared error',v:'rmse'},{n:'Mean absolute error',v:'mae'}];
    var coloringSchemes = [{n:'Absolute divergence',v:'absolute'},{n:'Relative divergence',v:'relative'}];
    var displayModelData = ["Average", "All"];

    // keep track of filter states
    const [selectedStation, setSelectedStation] = useState([]);  
    const [refStation, setRefStation] = useState(true);
    const [nonrefStation, setNonRefStation] = useState(true);

    const [selectedYear, setSelectedYear] = useState([0,0]);
    const [selectedModels, setSelectedModels] = useState([]);
    const [coloringScheme, setColoringScheme] = useState('absolute');
    const [accuracyOrdering, setAccuracyOrdering] = useState('None');
    const [localRangeValues, setLocalRangeValues] = useState(true);
    const [columnValue, setColumnValue] = useState(4);
    const [displayModel, setDisplayModel] = useState("Average");

    const [allYears, setAllYears] = useState([]);
    const [allModels, setAllModels] = useState([]);

    const [selectedStationData, setSelectedStationData] = useState([]);
    const [selectedStationHM, setSelectedStationHM] = useState([]);


    // keep track of maps state
    const [viewport, setViewPort] = useState({
        latitude: 37.342218,
        longitude: -117.889792,
        width: '50vw',  
        height: '75vh', 
        zoom: 5
    });
    const [stationdata, setStationData] = useState([]);
    const [showPopup, setShowPopup] = useState(true);
    const [hoverStationProps, sethoverStationProps] = useState([]); // use for hovering



    // load selected station data
    const loadFiltersData = (currStation) => {
        // if click same marker do unclick
        if (selectedStation.includes(currStation)){
            unclickMarker(currStation);
        } else {
            // here do operations for clicks
            // read prediction files
            var files = [];
            files.push(d3.csv('./data/prediction'+currStation+'.csv'));
            files.push(d3.csv('./data/'+currStation+'.csv'));

            
            Promise.all(files)
            .then(
                function(read_files) {
                    // handle reading HTML aka file not found
                    if (read_files[0].length === 42 && read_files[0].columns[0] === "<!DOCTYPE html>"){
                        throw new Error("File Not Found");
                    }

                    if (read_files[1].length === 42 && read_files[1].columns[0] === "<!DOCTYPE html>"){
                        throw new Error("File Not Found");
                    }
                    
                    // set selected station
                    setSelectedStation([...new Set([...selectedStation, currStation])]);
                    setSelectedStationHM([...new Set([...selectedStation, currStation])][0]);

                    // preprocess only once
                    function rowConverterPrediction(d){
                        return {
                            date: new Date(d.ds.split('-')[0], d.ds.split('-')[1] - 1, d.ds.split('-')[2]),
                            model: d.index,
                            yhat: +d.yhat
                        }
                    }
            
                    function rowConverterTruth(d){
                        return {
                            date: new Date(d.Date.split('-')[0], d.Date.split('-')[1] - 1, d.Date.split('-')[2]),
                            y: +d.Streamflow
                        }
                    }
                    
                    var currdata = [...selectedStationData]
                    var appendneeded = true;
                    // loop to check if already exist
                    for (var i = 0; i < currdata.length; i++){
                        if (currdata[i][2] === currStation){
                            // skip
                            appendneeded = false;
                        }
                    }

                    
                    // if need to append
                    if (appendneeded){
                        // convert row to correct data type
                        var prediction = read_files[0].map(x => rowConverterPrediction(x));
                        var groundTruth = read_files[1].map(x => rowConverterTruth(x));
                        read_files = [prediction, groundTruth, currStation];
                        
                        // set selected station data
                        setSelectedStationData([...selectedStationData, read_files]);

                        // get unique elements of years from actual file and prediction file
                        var yearsListpred = read_files[0].map(x => x.date.getFullYear()); // get all years from pred file
                        var yearListactual = read_files[1].map(x => x.date.getFullYear()); // get all years from actual file

                        var yearsList = [...new Set([...allYears, ...yearsListpred, ...yearListactual])]; // get unique elements
                        yearsList = Array.from(yearsList).sort();

                        // set all year
                        setAllYears(yearsList);

                        // set year as first element
                        setSelectedYear([yearsList[0], yearsList.slice(-1)[0]]);
        
                        // get unique elements of models from prediction file
                        var modelsList = read_files[0].map(x => x.model);  // get all models
                        modelsList = [...new Set([...allModels, ...modelsList])]; // get unique elements
                        modelsList = Array.from(modelsList).sort();
                        
                        // set all models
                        setAllModels(modelsList);
                    }

                }
            ).catch(function(e) {
                console.log(e);
                // catch any no files
                console.error('File ../data/prediction'+currStation+'.csv not found!');
                //clearCanvas();
            });   
        }
    }
    

    // function to filter (Reference/NonReference Station)
    const filterStations = (type) => {
        var currref = refStation;
        var currnonref = nonrefStation;
        if (type === 'Ref'){
            currref = !currref;
            setRefStation(!refStation);
        } else {
            currnonref = !currnonref;
            setNonRefStation(!nonrefStation);
        }

        var files = [];
        files.push(d3.csv('./data/stations.csv'));
        Promise.all(files).then(
            function(data) {
                var filt;
                if (currref === true && currnonref === true){
                    filt =  data[0]
                } else if (currref === true && currnonref === false){
                    filt = data[0].filter(d => d.CLASS==='Ref');
                } else if (currref === false && currnonref === true){
                    filt = data[0].filter(d => d.CLASS==='Non-ref');
                } else {
                    filt = [];
                }
                setStationData(filt);
            }
        );
    }

    // function for unclick
    const unclickMarker = (unclickstation) => {
        setSelectedStation(selectedStation.filter(item => item !== unclickstation)); // remove selection
        setSelectedStationHM(selectedStation.filter(item => item !== unclickstation)[0]); 

        var currselecteddata = [...selectedStationData];
        currselecteddata = currselecteddata.filter(item => item[2] !== unclickstation);

        // get unique elements of years from actual file and prediction file from remaining elements
        var yltemp = [];
        var mltemp = [];
        currselecteddata.forEach((e) => {
                var temppred = e[0].map(x => x.date.getFullYear());
                var tempactual =  e[1].map(x => x.date.getFullYear());
                yltemp = [...new Set([...yltemp, ...temppred, ...tempactual])];
                temppred = e[0].map(x => x.model);
                mltemp = [...new Set([...mltemp, ...temppred])];
            }
        );
        // sort data
        yltemp = Array.from(yltemp).sort();
        mltemp = Array.from(mltemp).sort();

        setAllYears(yltemp); 
        setAllModels(mltemp);
        setSelectedStationData(currselecteddata); // remove unclick data
    }

    // function to clear all canvas
    const clearCanvas = () => {
        setSelectedStation([]); // set selectedStation to Null
        setSelectedStationData([]);
        setSelectedYear([0,0]); // set selectedYear to Null
        setSelectedModels([]); // set selectedModel to Null
        setAllYears([]); // set allYears to Null
        setAllModels([]); // set allModels to Null
    }

    // initial render 
    useEffect(() => {
        // ...D3 codes
        // push initial files
        var files = [];
        files.push(d3.csv('./data/stations.csv'));
        Promise.all(files).then(
            function(data) {
                setStationData(data[0]);
                console.log("stationdata", data[0]);

                // #################################################################### FOR TESTING ONLY. DELETE LATER
                setSelectedModels(["ModelA", "ModelB", "ModelC"]);  //
                setSelectedYear([1979, 2019]);
                setSelectedStation(["11195500", "11197250"]); 
                setSelectedStationHM("11195500");

                // preprocess only once
                function rowConverterPrediction(d){
                    return {
                        date: new Date(d.ds.split('-')[0], d.ds.split('-')[1] - 1, d.ds.split('-')[2]),
                        model: d.index,
                        yhat: +d.yhat
                    }
                }
                function rowConverterTruth(d){
                    return {
                        date: new Date(d.Date.split('-')[0], d.Date.split('-')[1] - 1, d.Date.split('-')[2]),
                        y: +d.Streamflow
                    }
                }

                var files = [];
                files.push(d3.csv('./data/prediction'+11195500+'.csv'));
                files.push(d3.csv('./data/'+11195500+'.csv'));
                files.push(d3.csv('./data/prediction'+11197250+'.csv'));
                files.push(d3.csv('./data/'+11197250+'.csv')); 

                Promise.all(files)
                .then(
                    function(read_files) {
                        var testingarr = []
                        // convert row to correct data type
                        var prediction = read_files[0].map(x => rowConverterPrediction(x));
                        var groundTruth = read_files[1].map(x => rowConverterTruth(x));
                        var temppp = [prediction, groundTruth, 11195500];
                        testingarr.push(temppp);

                        prediction = read_files[2].map(x => rowConverterPrediction(x));
                        groundTruth = read_files[3].map(x => rowConverterTruth(x));
                        temppp = [prediction, groundTruth, 11197250];
                        testingarr.push(temppp);

                        setSelectedStationData(testingarr);
                    }
                ).catch(function(e) {
                    console.log(e);
                    // catch any no files
                    console.error('File ../data/prediction'+11197250+'.csv not found!');
                });
            }
        );

        // listener for reset map with r key
        const rkeylistener = e => {
            if(e.key === 'r'){ resetMap(); }
        }
        window.addEventListener("keydown", rkeylistener);

        return () => {
            window.removeEventListener("keydown", rkeylistener);
        }
    }, []);

    // handle popup in maps
    const handlePopup = (dataprops) => {
        setShowPopup(true);
        sethoverStationProps(dataprops);
    }

    // function to reset map to original position and clear selected stateion
    const resetMap = () => {
        setViewPort({
            latitude: 37.342218,
            longitude: -117.889792,
            width: '50vw',  
            height: '75vh', 
            zoom: 5
        });
    }

    // set viewport and limit area of view
    const changeviewport = (viewport) => {
        if (+viewport.longitude > -115.198119){ // goes too far right
            setViewPort({
                latitude: viewport.latitude,
                longitude:  -115.198119,
                width: viewport.width,
                height: viewport.height,
                zoom: viewport.zoom
            })
        } else if (+viewport.longitude < -124.467979){ // goes too far left 
            setViewPort({
                latitude: viewport.latitude,
                longitude:  -124.467979,
                width: viewport.width,
                height: viewport.height,
                zoom: viewport.zoom
            })
        } else if (+viewport.latitude > 42.050109){ // goes too far top
            setViewPort({
                latitude: 42.050109,
                longitude:  viewport.longitude,
                width: viewport.width,
                height: viewport.height,
                zoom: viewport.zoom
            })
        } else if (+viewport.latitude < 32.5){ // goes too far down
            setViewPort({
                latitude: 32.5,
                longitude:  viewport.longitude,
                width: viewport.width,
                height: viewport.height,
                zoom: viewport.zoom
            })
        } else {
            setViewPort(viewport);
        }
    }

    
    // handle multiple select of selected model
    const handleSelectedModels = (event) => {
        const curr = Array.from(event.target.selectedOptions, (item) => item.value);
        setSelectedModels(curr);
    }
    
    // handle slide in year
    const handleSelectYear = (d, newSelectedYear) => {
        setSelectedYear(newSelectedYear);
    }

    // handle blur
    const handleBlur = () => {
        var temp;
        if (isNaN(parseFloat(selectedYear[0])) === true || selectedYear[0] < allYears[0] || selectedYear[0] > selectedYear[1]) {
            temp = selectedYear;
            setSelectedYear([allYears[0], temp[1]]);
        }
        if (isNaN(parseFloat(selectedYear[1])) === true || selectedYear[1] > allYears.slice(-1)[0] || selectedYear[0] > selectedYear[1]) {
            temp = selectedYear;
            setSelectedYear([temp[0], allYears.slice(-1)[0]]);
        }

    };

    // handle input year 
    const handleInputYear = (e, option) => {
        var temp;
        if (option === 1){
            temp = selectedYear;
            setSelectedYear([+e.target.value, temp[1]]);
        } else {
            temp = selectedYear;
            setSelectedYear([temp[0], +e.target.value]);
        }
    }



    return (
        <div style={{margin: "20px"}}>
            <div style={{display: "flex", alignItems: "center"}}>
                <FormControlLabel
                    control={
                        <Checkbox id="refCheckBox" checked={refStation} onClick={() => {filterStations('Ref')}} name="RefCheck"
                        color="primary" label="Reference Stations" size="small"/>
                    } label="Reference Stations" />
                <FormControlLabel
                    control={
                        <Checkbox id="non-refCheckBox" checked={nonrefStation} onClick={() => {filterStations('Non-ref')}} name="NonRefCheck"
                        color="primary" label="Non Reference Stations" size="small"/>
                    } label="Non Reference Stations" />
                <Button variant="contained" onClick={() => resetMap()} disableElevation>Reset Map</Button>
                <p style={{marginLeft: "10px", fontWeight: "bold"}}>{"Selected Station: " + selectedStation}</p>
                </div>
            <div style={{display: "flex", alignItems: "center", margin: "10px"}}>
                <Grid container spacing={0}>
                    <Grid item xs={12} sm={7} md={7}>
                        {/* <ReactMapGL {...viewport}
                            mapboxApiAccessToken={mapboxapitoken}
                            onViewportChange={(viewport) => { changeviewport(viewport);}}
                            mapStyle="mapbox://styles/jsantoso2/ckhi6heb60oia19n1f0a3vjoi"
                        >
                            {stationdata.map(function(d){
                                if (selectedStation.includes(d.STAID)){
                                    return (<Marker key={d.STAID} latitude={+d.LAT_GAGE} longitude={+d.LNG_GAGE}>
                                        <button className="marker-btn" onClick={(e) => {e.preventDefault(); loadFiltersData(d.STAID)}} onMouseOut = {(e) => {setShowPopup(false); sethoverStationProps([]);}}
                                        onMouseOver = {(e) => {e.preventDefault(); handlePopup([{lat: +d.LAT_GAGE, long: +d.LNG_GAGE, name: d.STANAME, id: d.STAID}])}}>
                                            <img src={yellowcircle} alt="circmarker"/>
                                        </button>
                                    </Marker>)
                                } else if(d.CLASS === 'Ref'){
                                    return (<Marker key={d.STAID} latitude={+d.LAT_GAGE} longitude={+d.LNG_GAGE}>
                                                <button className="marker-btn" onClick={(e) => {e.preventDefault(); loadFiltersData(d.STAID)}} onMouseOut = {(e) => {setShowPopup(false); sethoverStationProps([]);}}
                                                onMouseOver = {(e) => {e.preventDefault(); handlePopup([{lat: +d.LAT_GAGE, long: +d.LNG_GAGE, name: d.STANAME, id: d.STAID}])}}>
                                                    <img src={redcircle} alt="circmarker"/>
                                                </button>
                                            </Marker>)
                                } else{
                                    return (<Marker key={d.STAID} latitude={+d.LAT_GAGE} longitude={+d.LNG_GAGE}>
                                                <button className="marker-btn" onClick={(e) => {e.preventDefault(); loadFiltersData(d.STAID)}} onMouseOut = {(e) => {setShowPopup(false); sethoverStationProps([]);}}
                                                onMouseOver = {(e) => {e.preventDefault(); handlePopup([{lat: +d.LAT_GAGE, long: +d.LNG_GAGE, name: d.STANAME, id: d.STAID}])}} >
                                                    <img src={redrect} alt="rectmarker"/>
                                                </button>
                                            </Marker>)
                                }
                            })}

                            {(showPopup) && (hoverStationProps.length === 1) ? ( 
                                <Popup
                                    latitude={hoverStationProps[0].lat}
                                    longitude={hoverStationProps[0].long}
                                    dynamicPosition={false}
                                    closeButton={false}
                                >
                                    <div className="popuptext">
                                        <h3>{"ID: " + hoverStationProps[0].id}</h3>
                                        <p>{"Name: " + hoverStationProps[0].name}</p>
                                    </div>
                                </Popup>
                            ) : null }
                        </ReactMapGL> */}
                        <div style={{height: "75vh", width: "50vw", backgroundColor: "black"}}></div>
                    </Grid>
                    <Grid item xs={12} sm={5} md={5}>
                        <div style={{borderStyle: "solid", height: "75vh"}}>
                            <h2 style={{textAlign: "center", marginTop: "10px", marginBottom: "10px"}}>Please Select Filters:</h2>
                            <hr/>
                            <br/>
                            <Grid container spacing={0}>
                                <Grid item xs={12} sm={6} md={5} style={{marginLeft: "20px"}}>
                                    <Typography gutterBottom> Year: </Typography>
                                    <Slider value={selectedYear} min={allYears[0]} max={allYears.slice(-1)[0]} onChange={handleSelectYear}
                                        valueLabelDisplay="auto" aria-labelledby="range-slider" />
                                    <div style={{display: "flex", alignItems: "center"}}>
                                        <InputLabel shrink> Start: </InputLabel>
                                        <Input style={{width: 70, marginRight: "5px"}} value={selectedYear[0]} onChange={(e) => handleInputYear(e, 1)} onBlur={handleBlur} type='number'/>
                                        <InputLabel shrink> End: </InputLabel>
                                        <Input style={{width: 70}} value={selectedYear[1]} onChange={(e) => handleInputYear(e, 2)} onBlur={handleBlur} type='number'/>
                                    </div>
                                    <br/>
                                    <FormControl style={{marginBottom: "15px"}}>
                                        <InputLabel shrink> Model: </InputLabel>
                                        <Select multiple native onChange={handleSelectedModels}>
                                            {allModels.map(x => <option value={x} key={"model"+x}>{x}</option>)}
                                        </Select>
                                        <FormHelperText>Model List</FormHelperText>
                                    </FormControl>
                                    <br/>
                                    <FormControl>
                                        <InputLabel shrink> Display: </InputLabel>
                                        <NativeSelect onChange={(d) => setDisplayModel(d.target.value)}>
                                            {displayModelData.map(x => <option value={x} key={x}>{x}</option>)}
                                        </NativeSelect>
                                        <FormHelperText>Average/All</FormHelperText>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6} md={5} style={{marginLeft: "20px"}}>
                                    <FormControl style={{marginBottom: "15px"}}>
                                        <InputLabel shrink> Coloring Scheme: </InputLabel>
                                        <NativeSelect onChange={(d) => setColoringScheme(d.target.value)}>
                                            {coloringSchemes.map(x => <option value={x.v} key={x.v}>{x.n}</option>)}
                                        </NativeSelect>
                                        <FormHelperText>Absolute/Relative</FormHelperText>
                                    </FormControl>
                                    <FormControl style={{marginBottom: "15px"}}>
                                        <InputLabel shrink> Accuracy Ordering: </InputLabel>
                                        <NativeSelect onChange={(d) => setAccuracyOrdering(d.target.value)}>
                                            {accuracyMeasures.map(x => <option value={x.v} key={x.v}>{x.n}</option>)}
                                        </NativeSelect>
                                        <FormHelperText>None/MAE/MSE</FormHelperText>
                                    </FormControl>
                                    <FormControl style={{marginBottom: "15px"}}>
                                        <InputLabel shrink># of Columns: </InputLabel>
                                        <NativeSelect onChange={(d) => setColumnValue(d.target.value)}>
                                            {numCols.map(x => <option value={x} key={"cols"+x}>{x}</option>)}
                                        </NativeSelect>
                                        <FormHelperText># Columns for matrix</FormHelperText>
                                    </FormControl>
                                    <FormControlLabel
                                        control={
                                            <Checkbox checked={localRangeValues} onClick={() => {setLocalRangeValues(!localRangeValues)}} name="loclrangevalues"
                                            color="primary" label="Local Range Values" size="small"/>
                                        } label="Local Range Values" />
                                </Grid>
                            </Grid>
                        </div>
                    </Grid>
                </Grid>
            </div>
        
            
        <div id="filtersDiv">
            <p>{"localrangevalue: " + localRangeValues}</p>
            <p>{"columnvalue: " + columnValue}</p>
            <p>{"Accuracy ordering:" + accuracyOrdering}</p>
            <p>{"Coloring Scheme:" + coloringScheme}</p>
            <p>{"Selected year:" + selectedYear}</p>
            <p>{"Selected Model:" + selectedModels}</p>
            <p>{"Selected Station:" + selectedStation}</p>
            <p>{"Selected Display Model:" + displayModel}</p>
            
            {(selectedStationData.length > 0)?
                <LinechartMultiple key={"lcmultiple"} selectedStation={selectedStation} selectedModels={selectedModels} selectedYear={selectedYear} selectedStationData={selectedStationData} displayModel={displayModel}/>
            : null}


            {(selectedStationData.length > 0)?
                <div>
                    <FormControl style={{marginLeft: "20px", marginBottom: "20px"}}>
                        <InputLabel shrink>Display Station HeatMap: </InputLabel>
                        <NativeSelect onChange={(e) => setSelectedStationHM(e.target.value)} style={{width: "200px"}}>
                            {selectedStation.map(x => <option value={x} key={x}>{x}</option>)}
                        </NativeSelect>
                    </FormControl>
                    <Heatmap key={"hm"} oneselectedStation={selectedStationHM} selectedModels={selectedModels} selectedYear={selectedYear} prediction={selectedStationData.filter(x => +x[2] === +selectedStationHM)[0][0]} groundTruth={selectedStationData.filter(x => +x[2] === +selectedStationHM)[0][1]}/>
                </div>
            : null}
            

            {/* <Stackedbar selectedStation={selectedStation} selectedModels={selectedModels} selectedYear={selectedYear} prediction={selectedStationData[0]} groundTruth={selectedStationData[1]}/> */}
            {(selectedStation.length > 0) && (selectedModels.length > 0) && (selectedStationData.length > 0)? 
            <div>
                {/* I HARD CODED THE YEAR TO 2018 HEREEEE  and also only selected One Station*/}
                {/* <LayoutMatricesMeanMajority selectedStation={selectedStation[0]} selectedYear={2019} selectedModels={selectedModels}
                                    coloringScheme={coloringScheme} mode={'avg'} prediction={selectedStationData[0][0]} groundTruth={selectedStationData[0][1]}/>
                <LayoutMatricesMeanMajority selectedStation={selectedStation[0]} selectedYear={2019} selectedModels={selectedModels}
                                    coloringScheme={coloringScheme} mode={'maj'} prediction={selectedStationData[0][0]} groundTruth={selectedStationData[0][1]}/>
                <LayoutMatricesMeanMajority selectedStation={selectedStation[0]} selectedYear={2019} selectedModels={selectedModels}
                                    coloringScheme={coloringScheme} mode={'div'} prediction={selectedStationData[0][0]} groundTruth={selectedStationData[0][1]}/>
                <LayoutMatricesRegular selectedStation={selectedStation[0]} selectedYear={2019} selectedModels={selectedModels}
                                    coloringScheme={coloringScheme} accuracyOrdering={accuracyOrdering} localRangeValues={localRangeValues}
                                    columnValue={columnValue} prediction={selectedStationData[0][0]} groundTruth={selectedStationData[0][1]}/> */}
            </div>
            : null
            }

        </div>
        </div>
    )
}


export default Mainfilter;


