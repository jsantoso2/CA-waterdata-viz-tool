import React, {useState, useEffect} from 'react';
import * as d3 from 'd3';
import MapGL, {Marker, Popup, Source, Layer} from 'react-map-gl';
import LinechartMultiple from './linechartmultiple';
import Heatmap from './heatmap';
import Barchart from './barchart';
import Header from './header';
import LineChartContractors from './linechartcontractors';

// import styles and Material UI
import { Grid, Checkbox, FormControlLabel, Button, FormControl, Select, InputLabel, NativeSelect, Slider, Typography, Input,
Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import {Alert} from '@material-ui/lab';


import ws1 from '../geojson_data/ws1.json';
import ws2 from '../geojson_data/ws2.json';
import ws3 from '../geojson_data/ws3.json';
import ws4 from '../geojson_data/ws4.json';

import cacounties from '../geojson_data/CACounties.json';
import powerplants from '../geojson_data/CAPowerPlants.json';
import contractors from '../geojson_data/Contractors.json';
import servicearea from '../geojson_data/ServiceAreasTemp.json';
import urbanarea from '../geojson_data/CAUrbanArea.json';

import hydroelectric from '../Hydroeletric.png';
import pumping from '../Pumping.png';

function Mainfilter() {
    // MAPBOX API TOKEN
    var mapboxapitoken = "pk.eyJ1IjoianNhbnRvc28yIiwiYSI6ImNrZ3NxYmc0MjBydXgyeXAyZTdoa2U1NXoifQ.Kb508UG3LtW2dakyxJj2eA";
    // map icons
    const ICON = `M20.2,15.7L20.2,15.7c1.1-1.6,1.8-3.6,1.8-5.7c0-5.6-4.5-10-10-10S2,4.5,2,10c0,2,0.6,3.9,1.6,5.4c0,0.1,0.1,0.2,0.2,0.3
    c0,0,0.1,0.1,0.1,0.2c0.2,0.3,0.4,0.6,0.7,0.9c2.6,3.1,7.4,7.6,7.4,7.6s4.8-4.5,7.4-7.5c0.2-0.3,0.5-0.6,0.7-0.9
    C20.1,15.8,20.2,15.8,20.2,15.7z`;
    const SIZE = 7;

    var window_height = window.innerHeight;
    var window_width = window.innerWidth;

    // code parameters
    var displayModelData = ["Average", "All"];

    const [openDialog, setOpenDialog] = useState(false);
    const [noDataDialog, setNoDataDialog] = useState([false, '']);

    // keep track of filter states
    const [selectedStation, setSelectedStation] = useState([]);  
    const [refStation, setRefStation] = useState(true);
    const [nonrefStation, setNonRefStation] = useState(true);
    const [wsCheckBox, setWSCheckBox] = useState(true);
    const [countiesCheckBox, setCountiesCheckBox] = useState(true);
    const [serviceCheckBox, setServiceCheckBox] = useState(true);
    const [powerCheckBox, setPowerCheckBox] = useState(true);
    const [urbanCheckBox, setUrbanCheckBox] = useState(true);
    const [contractorCheckBox, setContractorCheckBox] = useState(true);

    const [selectedYear, setSelectedYear] = useState([0,0]);
    const [selectedModels, setSelectedModels] = useState([]);
    const [displayModel, setDisplayModel] = useState("Average");

    const [allYears, setAllYears] = useState([]);
    const [allModels, setAllModels] = useState([]);

    const [selectedStationData, setSelectedStationData] = useState([]);
    //const [selectedStationHM, setSelectedStationHM] = useState([]);


    // keep track of maps state
    const [viewport, setViewPort] = useState({
        latitude: 37.342218,
        longitude: -117.889792,
        width: 0.7*window_width,  
        height: 0.68*window_height, 
        zoom: 4.9
    });
    const [stationdata, setStationData] = useState([]);
    const [showPopup, setShowPopup] = useState(true);
    const [hoverStationProps, sethoverStationProps] = useState([]); // use for hovering
    const [hoverWatershedProps, setHoverWatershedProps] = useState([]);
    const [hoverCountiesProps, setHoverCountiesProps] = useState([]);
    const [hoverServiceProps, setHoverServiceProps] = useState([]);
    const [hoverPowerProps, setHoverPowerProps] = useState([]);
    const [hoverUrbanProps, setHoverUrbanProps] = useState([]);
    const [hoverContractorProps, setContractorProps] = useState([]);

    const [currInteractiveLayer, setCurrInteractiveLayer] = useState([]);
    const [currInteractiveOptions, setCurrInteractiveOptions] = useState(['None', 'Counties', 'Service Area', 'Urban Area', 'Watershed']);


    // load selected station data
    const loadFiltersData = (currStation) => {
        // if click same marker do unclick
        if (selectedStation.includes(currStation)){
            unclickMarker(currStation);
        } else if (selectedStation.length >= 2){
            setOpenDialog(true);
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
                    // setSelectedStationHM([...new Set([...selectedStation, currStation])][0]);

                    // preprocess only once
                    function rowConverterPrediction(d){
                        return {
                            date: new Date(d.Date.split('-')[0], d.Date.split('-')[1] - 1, d.Date.split('-')[2]),
                            model: d.index,
                            yhat: +d.yhat
                        }
                    }
            
                    function rowConverterTruth(d){
                        if (d.Streamflow !== ""){
                            return {
                                date: new Date(d.Date.split('-')[0], d.Date.split('-')[1] - 1, d.Date.split('-')[2]),
                                y: +d.Streamflow,
                                ae: +d.Autoencoder
                            }
                        } else {
                            // deal with missing actual data
                            return {
                                date: new Date(d.Date.split('-')[0], d.Date.split('-')[1] - 1, d.Date.split('-')[2]),
                                y: -999,
                                ae: +d.Autoencoder
                            }
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
                setNoDataDialog([true, currStation]);
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
        // setSelectedStationHM(selectedStation.filter(item => item !== unclickstation)[0]); 

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
    /*const clearCanvas = () => {
        setSelectedStation([]); // set selectedStation to Null
        setSelectedStationData([]);
        setSelectedYear([0,0]); // set selectedYear to Null
        setSelectedModels([]); // set selectedModel to Null
        setAllYears([]); // set allYears to Null
        setAllModels([]); // set allModels to Null
    }*/

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

                // // #################################################################### FOR TESTING ONLY. DELETE LATER
                // setSelectedModels(["ModelA", "ModelB", "ModelC"]);  //
                // setSelectedYear([1979, 2019]);
                // setSelectedStation(["11195500", "11197250"]); // 
                // setSelectedStationHM("11195500");

                // // preprocess only once
                // function rowConverterPrediction(d){
                //     return {
                //         date: new Date(d.ds.split('-')[0], d.ds.split('-')[1] - 1, d.ds.split('-')[2]),
                //         model: d.index,
                //         yhat: +d.yhat
                //     }
                // }
                // function rowConverterTruth(d){
                //     if (d.Streamflow !== ""){
                //         return {
                //             date: new Date(d.Date.split('-')[0], d.Date.split('-')[1] - 1, d.Date.split('-')[2]),
                //             y: +d.Streamflow,
                //             ae: +d.Autoencoder
                //         }
                //     } else {
                //         return {
                //             date: new Date(d.Date.split('-')[0], d.Date.split('-')[1] - 1, d.Date.split('-')[2]),
                //             y: -999,
                //             ae: +d.Autoencoder
                //         }
                //     }
                // }

                // var files = [];
                // files.push(d3.csv('./data/prediction'+11195500+'.csv'));
                // files.push(d3.csv('./data/'+11195500+'.csv'));
                // files.push(d3.csv('./data/prediction'+11197250+'.csv'));
                // files.push(d3.csv('./data/'+11197250+'.csv')); 

                // Promise.all(files)
                // .then(
                //     function(read_files) {
                //         var testingarr = []
                //         // convert row to correct data type
                //         var prediction = read_files[0].map(x => rowConverterPrediction(x));
                //         var groundTruth = read_files[1].map(x => rowConverterTruth(x));
                //         var temppp = [prediction, groundTruth, 11195500];
                //         testingarr.push(temppp);

                //         prediction = read_files[2].map(x => rowConverterPrediction(x));
                //         groundTruth = read_files[3].map(x => rowConverterTruth(x));
                //         temppp = [prediction, groundTruth, 11197250];
                //         testingarr.push(temppp);

                //         setSelectedStationData(testingarr);
                //     }
                // ).catch(function(e) {
                //     console.log(e);
                //     // catch any no files
                //     console.error('File ../data/prediction'+11197250+'.csv not found!');
                // });
            }
        );

        // add geoJSON WSBoundaries


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
            width: 0.7*window_width,  
            height: 0.68*window_height, 
            zoom: 4.9
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


    // handle click onMap
    const handleClickMapFeatures = (e) => {
        // get last element layer to be interactive only
        if (currInteractiveLayer[currInteractiveLayer.length - 1] === 'ws1' || currInteractiveLayer[currInteractiveLayer.length - 1] === 'ws2' ||
        currInteractiveLayer[currInteractiveLayer.length - 1] === 'ws3' || currInteractiveLayer[currInteractiveLayer.length - 1] === 'ws4'){
            if (typeof e.features !== "undefined" && e.features.length > 0){
                setHoverWatershedProps([e.features[0].properties.HUC8, e.features[0].properties.Name, e.lngLat[0], e.lngLat[1]]);
            } else {
                setHoverWatershedProps([]);
            }
        } else if (currInteractiveLayer[currInteractiveLayer.length - 1] === 'counties'){
            if (typeof e.features !== "undefined" && e.features.length > 0){
                setHoverCountiesProps([e.features[0].properties.NAMELSAD, e.features[0].properties.ALAND + e.features[0].properties.AWATER, e.features[0].properties.POPULATION, e.lngLat[0], e.lngLat[1]]);
            } else {
                setHoverCountiesProps([]);
            }
        } else if (currInteractiveLayer[currInteractiveLayer.length - 1] === 'service'){
            if (typeof e.features !== "undefined" && e.features.length > 0){
                setHoverServiceProps([e.features[0].properties.name, e.features[0].properties.total_population, e.lngLat[0], e.lngLat[1], e.features[0].properties.d_prin_cnt]);
            } else {
                setHoverServiceProps([]);
            }
        } else if (currInteractiveLayer[currInteractiveLayer.length - 1] === 'urban'){
            if (typeof e.features !== "undefined" && e.features.length > 0){
                setHoverUrbanProps([e.features[0].properties.NAME10, e.features[0].properties.population, e.lngLat[0], e.lngLat[1]]);
            } else {
                setHoverUrbanProps([]);
            }
        } 

    }

    // number with commas
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return (
        <div>
            <div id="home_container" style={{display: "block", position: "relative", top: "-150px", visibility: "hidden"}}></div>
            <Header/>
            <div style={{display: "flex", alignItems: "center", marginLeft: "10px", marginTop: 0.18*window_height}}>
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
                <FormControlLabel
                    control={
                        <Checkbox id="wsCheckBox" checked={wsCheckBox} name="WSCheck"
                            onClick={() => {setWSCheckBox(!wsCheckBox); 
                                if (!wsCheckBox === true){
                                    setCurrInteractiveOptions(Array.from([...new Set([...currInteractiveOptions, 'Watershed'])]).sort());
                                } else {
                                    setCurrInteractiveOptions(currInteractiveOptions.filter(x => x !== 'Watershed'));
                                }
                            }} 
                            color="primary" label="Watershed" size="small"/>
                    } label="Watershed" />
                <FormControlLabel
                    control={
                        <Checkbox id="countiesCheckBox" checked={countiesCheckBox} name="CountiesCheck"
                            onClick={() => {setCountiesCheckBox(!countiesCheckBox); 
                                if (!countiesCheckBox === true){
                                    setCurrInteractiveOptions(Array.from([...new Set([...currInteractiveOptions, 'Counties'])]).sort());
                                } else {
                                    // remove counties layer
                                    setCurrInteractiveOptions(currInteractiveOptions.filter(x => x !== 'Counties'));
                                }
                            }} 
                            color="primary" label="Counties" size="small"/>
                    } label="Counties" />
                <FormControlLabel
                    control={
                        <Checkbox id="serviceCheckBox" checked={serviceCheckBox} name="ServiceCheck"
                            onClick={() => {setServiceCheckBox(!serviceCheckBox); 
                                if (!serviceCheckBox === true){
                                    setCurrInteractiveOptions(Array.from([...new Set([...currInteractiveOptions, 'Service Area'])]).sort());
                                } else {
                                    // remove service layer
                                    setCurrInteractiveOptions(currInteractiveOptions.filter(x => x !== 'Service Area'));
                                }
                            }} 
                            color="primary" label="Service Area" size="small"/>
                    } label="Service Area" />
                <FormControlLabel
                    control={
                        <Checkbox id="powerCheckBox" checked={powerCheckBox} name="PowerCheck"
                            onClick={() => setPowerCheckBox(!powerCheckBox)}
                            color="primary" label="Power Plant" size="small"/>
                    } label="Power Plant" />
                <FormControlLabel
                    control={
                        <Checkbox id="urbanCheckBox" checked={urbanCheckBox} name="UrbanCheck"
                            onClick={() => {setUrbanCheckBox(!urbanCheckBox); 
                                if (!urbanCheckBox === true){
                                    setCurrInteractiveOptions(Array.from([...new Set([...currInteractiveOptions, 'Urban Area'])]).sort());
                                } else {
                                    // remove service layer
                                    setCurrInteractiveOptions(currInteractiveOptions.filter(x => x !== 'Urban Area'));
                                }
                            }} 
                            color="primary" label="Urban Area" size="small"/>
                    } label="Urban Area" />
                <FormControlLabel
                    control={
                        <Checkbox id="contractorCheckBox" checked={contractorCheckBox} name="ContractorCheck"
                            onClick={() => setContractorCheckBox(!contractorCheckBox)}
                            color="primary" label="Contractors" size="small"/>
                    } label="Contractors" />
                <Button variant="contained" onClick={() => resetMap()} disableElevation>Reset Map</Button>
            </div>
            <div style={{display: "flex", alignItems: "center", marginLeft: "10px"}}>
                <p style={{marginRight: "10px", fontWeight: "bold"}}>Interactive Layer: </p>
                    <FormControl style={{width: "150px", marginRight: "20px"}}>
                        <NativeSelect onChange={(d) => {
                            if (d.target.value === 'Counties'){
                                setCurrInteractiveLayer(["counties"]);
                            } else if (d.target.value === 'Service Area'){
                                setCurrInteractiveLayer(["service"]);
                            } else if (d.target.value === 'Urban Area'){
                                setCurrInteractiveLayer(["urban"]);
                            } else if (d.target.value === 'None'){
                                setCurrInteractiveLayer([]);
                            } else {
                                setCurrInteractiveLayer(["ws1", "ws2", "ws3", "ws4"]);
                            }
                        }}>
                            {currInteractiveOptions.map(x => <option value={x} key={x}>{x}</option>)}
                        </NativeSelect>
                    </FormControl>
                <p style={{marginLeft: "10px", fontWeight: "bold"}}>{"Selected Station: " + selectedStation}</p>

            </div>
            <div style={{display: "flex", alignItems: "center", margin: "10px"}}>
                <Grid container spacing={0}>
                    <Grid item xs={12} sm={12} md={9}>
                        <MapGL {...viewport}
                            mapboxApiAccessToken={mapboxapitoken}
                            onViewportChange={(viewport) => { changeviewport(viewport);}}
                            mapStyle= "mapbox://styles/jsantoso2/ckhobdd621o1u1apeoapjb84i"   
                            onClick={handleClickMapFeatures}
                            interactiveLayerIds={currInteractiveLayer}
                        >
                            {stationdata.map(function(d){
                                if (selectedStation.includes(d.STAID)){
                                    return (<Marker key={d.STAID} latitude={+d.LAT_GAGE} longitude={+d.LNG_GAGE}>
                                            <svg height={SIZE} viewBox="0 0 24 24" style={{cursor: 'pointer', fill: 'yellow', stroke: 'none', transform: `translate(${-SIZE / 2}px,${-SIZE}px)`}}
                                                onClick={(e) => {e.preventDefault(); loadFiltersData(d.STAID)}}  onMouseOut = {(e) => {setShowPopup(false); sethoverStationProps([]);}}
                                                onMouseOver = {(e) => {e.preventDefault(); handlePopup([{lat: +d.LAT_GAGE, long: +d.LNG_GAGE, name: d.STANAME, id: d.STAID, statype: d.CLASS}]); }}
                                            >
                                                <path d={ICON} />
                                            </svg>
                                            </Marker>)
                                } else if(d.CLASS === 'Ref'){
                                    return (<Marker key={d.STAID} latitude={+d.LAT_GAGE} longitude={+d.LNG_GAGE}>
                                            <svg height={SIZE} viewBox="0 0 24 24" style={{cursor: 'pointer', fill: 'blue', stroke: 'none', transform: `translate(${-SIZE / 2}px,${-SIZE}px)`}}
                                                onClick={(e) => {e.preventDefault(); loadFiltersData(d.STAID)}}  onMouseOut = {(e) => {setShowPopup(false); sethoverStationProps([]);}}
                                                onMouseOver = {(e) => {e.preventDefault(); handlePopup([{lat: +d.LAT_GAGE, long: +d.LNG_GAGE, name: d.STANAME, id: d.STAID, statype: d.CLASS}]); }}
                                            >
                                                <path d={ICON} />
                                            </svg>
                                            </Marker>)
                                } else{
                                    return (<Marker key={d.STAID} latitude={+d.LAT_GAGE} longitude={+d.LNG_GAGE}>
                                            <svg height={SIZE} viewBox="0 0 24 24" style={{cursor: 'pointer', fill: 'red', stroke: 'none', transform: `translate(${-SIZE / 2}px,${-SIZE}px)`}}
                                                onClick={(e) => {e.preventDefault(); loadFiltersData(d.STAID)}}  onMouseOut = {(e) => {setShowPopup(false); sethoverStationProps([]);}}
                                                onMouseOver = {(e) => {e.preventDefault(); handlePopup([{lat: +d.LAT_GAGE, long: +d.LNG_GAGE, name: d.STANAME, id: d.STAID, statype: d.CLASS}]); }}
                                            >
                                                <path d={ICON} />
                                            </svg>
                                            </Marker>)
                                }
                            })}

                            {(typeof cacounties  !== "undefined")?
                                <Source id="counties" type="geojson" data={cacounties}>
                                   <Layer id="counties" type="fill" paint={{"fill-color": {
                                            property: 'POPULATION',
                                            stops: [
                                                [0, '#FDEDEC'],
                                                [100000, '#FADBD8'],
                                                [300000, '#F5B7B1'],
                                                [500000, "#F1948A"],
                                                [1000000, '#EC7063'],
                                                [5000000, '#E74C3C'],
                                                [10000000, '#CB4335'],
                                                [15000000, '#B03A2E']
                                            ]
                                        }, "fill-opacity": countiesCheckBox?0.6:0, "fill-outline-color": "black"}}>
                                    </Layer>
                                </Source>
                            : null}

                            {(typeof urbanarea  !== "undefined")?
                                <Source id="urban" type="geojson" data={urbanarea}>
                                   <Layer id="urban" type="fill" paint={{"fill-color": {
                                            property: 'population',
                                            stops: [
                                                [0, '#FDEDEC'],
                                                [100000, '#FADBD8'],
                                                [300000, '#F5B7B1'],
                                                [500000, "#F1948A"],
                                                [1000000, '#EC7063'],
                                                [5000000, '#E74C3C'],
                                                [10000000, '#CB4335'],
                                                [15000000, '#B03A2E']
                                            ]
                                        }, "fill-opacity": urbanCheckBox?0.6:0, "fill-outline-color": "black"}}>
                                    </Layer>
                                </Source>
                            : null}
                            
                            {(typeof servicearea  !== "undefined")?
                                <Source id="service" type="geojson" data={servicearea}>
                                   <Layer id="service" type="fill" paint={{"fill-color": ["string", ["get", "color"]],
                                    "fill-opacity": serviceCheckBox?0.9:0, "fill-outline-color": "black"}}>
                                    </Layer>
                                </Source>
                            : null}

                            {powerplants.map(function(d){
                                if (powerCheckBox){
                                    return <Marker key={d.Plant_ID} latitude={+d.latitude} longitude={+d.longitude}>
                                                {/* <svg height={SIZE} viewBox="0 0 24 24" style={{cursor: 'pointer', fill: 'orange', stroke: 'none', transform: `translate(${-SIZE / 2}px,${-SIZE}px)`}}
                                                    onMouseOut = {(e) => {setShowPopup(true); setHoverPowerProps([]);}}
                                                    onMouseOver = {(e) => {e.preventDefault(); setShowPopup(true); setHoverPowerProps([{lat: +d.latitude, long: +d.longitude, name: d.Name, id: d.Plant_ID, MW: +d.MW}]); }}
                                                >
                                                    <path d={ICON} />
                                                </svg> */}
                                                <button style={{background: "none", border: "none", cursor: "pointer"}}
                                                    onMouseOut = {(e) => {setShowPopup(true); setHoverPowerProps([]);}}
                                                    onMouseOver = {(e) => {e.preventDefault(); setShowPopup(true); setHoverPowerProps([{lat: +d.latitude, long: +d.longitude, name: d.Name, id: d.Plant_ID, MW: +d.MW}]); }}
                                                >
                                                    <img style={{width: "7px", height: "7px"}} src={hydroelectric} alt="powerplant" />
                                                </button>
                                            </Marker>
                                }else {
                                    return null;
                                }
                            })};

                            {contractors.map(function(d){
                                if (contractorCheckBox){
                                    return <Marker key={d.ID} latitude={+d.LAT} longitude={+d.LONG}>
                                                {/* <svg height={SIZE} viewBox="0 0 24 24" style={{cursor: 'pointer', fill: 'yellow', stroke: 'none', transform: `translate(${-SIZE / 2}px,${-SIZE}px)`}}
                                                    onMouseOut = {(e) => {setShowPopup(true); setContractorProps([]);}}
                                                    onMouseOver = {(e) => {e.preventDefault(); setShowPopup(true); setContractorProps([{lat: +d.LAT, long: +d.LONG, name: d.Contractor, historical: [+d.Total_2009, +d.Total_2010, +d.Total_2011, +d.Total_2012, +d.Total_2013, +d.Total_2014, +d.Total_2015, +d.Total_2016, +d.Total_2017, +d.Total_2018]}]); }}
                                                >
                                                    <path d={ICON} />
                                                </svg> */}
                                                <button style={{background: "none", border: "none", cursor: "pointer"}}
                                                     onMouseOut = {(e) => {setShowPopup(true); setContractorProps([]);}}
                                                     onMouseOver = {(e) => {e.preventDefault(); setShowPopup(true); setContractorProps([{lat: +d.LAT, long: +d.LONG, name: d.Contractor, historical: [+d.Total_2009, +d.Total_2010, +d.Total_2011, +d.Total_2012, +d.Total_2013, +d.Total_2014, +d.Total_2015, +d.Total_2016, +d.Total_2017, +d.Total_2018]}]); }}
                                                >
                                                    <img style={{width: "7px", height: "7px"}} src={pumping} alt="contractors" />
                                                </button>
                                            </Marker>
                                } else {
                                   return null;
                                }
                            })}


                            {(typeof ws1 !== "undefined")? 
                                <Source id="ws1" type="geojson" data={ws1}>
                                    <Layer id="ws1" type="fill" paint={{"fill-color": "#f598be", "fill-opacity": wsCheckBox?0.6:0, "fill-outline-color": "black"}}></Layer>
                                </Source>
                            : null}
                            {(typeof ws2 !== "undefined")? 
                                <Source id="ws2" type="geojson" data={ws2}>
                                    <Layer id="ws2" type="fill" paint={{"fill-color": "#a1f2d0", "fill-opacity": wsCheckBox?0.6:0, "fill-outline-color": "black"}}></Layer>
                                </Source>
                            : null}
                            {(typeof ws3 !== "undefined")? 
                                <Source id="ws3" type="geojson" data={ws3}>
                                    <Layer id="ws3" type="fill" paint={{"fill-color": "#e2b1f2", "fill-opacity": wsCheckBox?0.6:0, "fill-outline-color": "black"}}></Layer>
                                </Source>
                            : null}
                             {(typeof ws4 !== "undefined")? 
                                <Source id="ws4" type="geojson" data={ws4}>
                                    <Layer id="ws4" type="fill" paint={{"fill-color": "#d67ad0", "fill-opacity": wsCheckBox?0.6:0, "fill-outline-color": "black"}}></Layer>
                                </Source>
                            : null}

                

                            {(showPopup) && (hoverStationProps.length === 1) ? ( 
                                <Popup
                                    latitude={hoverStationProps[0].lat}
                                    longitude={hoverStationProps[0].long}
                                    dynamicPosition={false}
                                    closeButton={false}
                                >
                                    <div style={{fontSize: "10px"}}>
                                        <h3>{"ID: " + hoverStationProps[0].id}</h3>
                                        <h3>{"Type: " + hoverStationProps[0].statype}</h3>
                                        <p>{"Name: " + hoverStationProps[0].name}</p>
                                    </div>
                                </Popup>
                            ) : null }

                            {(hoverWatershedProps.length > 0) ? (
                                <Popup
                                   latitude={hoverWatershedProps[3]}
                                   longitude={hoverWatershedProps[2]}
                                   dynamicPosition={false}
                                   onClose={() => setHoverWatershedProps([])}
                               >
                                   <div style={{fontSize: "10px"}}>
                                       <h3>{"ID: " + hoverWatershedProps[0]}</h3>
                                       <p>{"Name: " + hoverWatershedProps[1]}</p>
                                   </div>
                               </Popup>
                            ) : null}

                            {(hoverCountiesProps.length > 0) ? (
                                <Popup
                                   latitude={hoverCountiesProps[4]}
                                   longitude={hoverCountiesProps[3]}
                                   dynamicPosition={false}
                                   onClose={() => setHoverCountiesProps([])}
                               >
                                   <div style={{fontSize: "10px"}}>
                                       <h3>{"Name: " + hoverCountiesProps[0]}</h3>
                                       <p>{"Land Area: " + numberWithCommas(Math.round(hoverCountiesProps[1]/1000000))  + " km2"}</p>
                                       <p>{"Population: " + numberWithCommas(hoverCountiesProps[2])}</p>
                                   </div>
                               </Popup>
                            ) : null}

                            {(hoverServiceProps.length > 0) ? (
                                <Popup
                                   latitude={hoverServiceProps[3]}
                                   longitude={hoverServiceProps[2]}
                                   dynamicPosition={false}
                                   onClose={() => setHoverServiceProps([])}
                               >
                                   <div style={{fontSize: "10px"}}>
                                       <h3>{"Contractor Name: " + hoverServiceProps[4]}</h3>
                                       <h3>{"Region Name: " + hoverServiceProps[0]}</h3>
                                       <p>{"Total Population Served: " + numberWithCommas(hoverServiceProps[1])}</p>
                                   </div>
                               </Popup>
                            ) : null}

                            {(hoverUrbanProps.length > 0) ? (
                                <Popup
                                   latitude={hoverUrbanProps[3]}
                                   longitude={hoverUrbanProps[2]}
                                   dynamicPosition={false}
                                   onClose={() => setHoverUrbanProps([])}
                               >
                                   <div style={{fontSize: "10px"}}>
                                       <h3>{"Urban Area Name: " + hoverUrbanProps[0]}</h3>
                                       <p>{"Population: " + numberWithCommas(hoverUrbanProps[1])}</p>
                                   </div>
                               </Popup>
                            ) : null}

                            {(showPopup) && (hoverPowerProps.length === 1)  ? (
                                 <Popup
                                 latitude={hoverPowerProps[0].lat}
                                 longitude={hoverPowerProps[0].long}
                                 dynamicPosition={false}
                                 closeButton={false}
                                >
                                    <div style={{fontSize: "10px"}}>
                                        <h3>{"ID: " + hoverPowerProps[0].id}</h3>
                                        <p>{"Name: " + hoverPowerProps[0].name}</p>
                                        <p>{"Capacity: " + hoverPowerProps[0].MW + "MW"}</p>
                                    </div>
                                </Popup>
                            ) : null}

                            {(showPopup) && (hoverContractorProps.length === 1)  ? (
                                 <Popup
                                    latitude={hoverContractorProps[0].lat}
                                    longitude={hoverContractorProps[0].long}
                                    dynamicPosition={false}
                                    closeButton={false}
                                >
                                    <div style={{fontSize: "10px"}}>
                                        <h3>{"Name: " + hoverContractorProps[0].name}</h3>
                                        <LineChartContractors historical={hoverContractorProps[0].historical}/>
                                    </div>
                                </Popup>
                            ) : null}

                        </MapGL>
                        {/* <div style={{height: "75vh", width: "50vw", backgroundColor: "black"}}></div> */}
                    </Grid>
                    <Grid item xs={12} sm={12} md={3}>
                        <div style={{borderStyle: "solid", height: 0.68*window_height, marginRight: "10px"}}>
                            <h3 style={{textAlign: "center", marginTop: "10px", marginBottom: "10px"}}>Please Select Filters:</h3>
                            <hr/>
                            <Grid container spacing={0}>
                                <Grid item xs={12} sm={12} md={12} style={{marginLeft: "20px", marginRight: "20px"}}>
                                    <Typography gutterBottom> Year: </Typography>
                                    <Slider value={selectedYear} min={allYears[0]} max={allYears.slice(-1)[0]} onChange={handleSelectYear}
                                        valueLabelDisplay="auto" aria-labelledby="range-slider" />
                                    <div style={{display: "flex", alignItems: "center"}}>
                                        <InputLabel shrink> Start: </InputLabel>
                                        <Input style={{width: 70, marginRight: "5px"}} value={selectedYear[0]} onChange={(e) => handleInputYear(e, 1)} onBlur={handleBlur} type='number'/>
                                        <InputLabel shrink> End: </InputLabel>
                                        <Input style={{width: 70}} value={selectedYear[1]} onChange={(e) => handleInputYear(e, 2)} onBlur={handleBlur} type='number'/>
                                    </div>
                                    <Alert severity="info">Select Year for Filter</Alert>
                                    <br/>
                                    <FormControl style={{marginBottom: "15px", width: "300px"}}>
                                        <InputLabel shrink> Model: </InputLabel>
                                        <Select multiple native onChange={handleSelectedModels}>
                                            {allModels.map(x => <option value={x} key={"model"+x}>{x}</option>)}
                                        </Select>
                                        <Alert severity="info">Select Models for Prediction</Alert>
                                    </FormControl>
                                    <br/>
                                    <FormControl style={{width: "300px"}}>
                                        <InputLabel shrink> Display: </InputLabel>
                                        <NativeSelect onChange={(d) => setDisplayModel(d.target.value)}>
                                            {displayModelData.map(x => <option value={x} key={x}>{x}</option>)}
                                        </NativeSelect>
                                        <Alert severity="info">Select Display Method Average/All</Alert>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </div>
                    </Grid>
                </Grid>
            </div>
            
            {/* ########## Seleted too much station dialog box############### */}
            <Dialog open={openDialog} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
                <DialogTitle>{"Selected More than 2 Stations!"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>Please unclick one station first before clicking another one!</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={e => setOpenDialog(false)} color="primary" autoFocus> Close </Button>
                </DialogActions>
            </Dialog>
            
            {/* ########## No Data Dialog ############### */}
            <Dialog open={noDataDialog[0]} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
                <DialogTitle>{"No Data Found!"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{"No data found for Station " + noDataDialog[1] + "!"}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={e => setNoDataDialog([false,''])} color="primary" autoFocus> Close </Button>
                </DialogActions>
            </Dialog>
        
            
        <div id="filtersDiv">
            {/* <p>{"Selected year:" + selectedYear}</p>
            <p>{"Selected Model:" + selectedModels}</p>
            <p>{"Selected Station:" + selectedStation}</p>
            <p>{"Selected Display Model:" + displayModel}</p> */}
            
            {(selectedStationData.length > 0)?
                <LinechartMultiple key={"lcmultiple"} selectedStation={selectedStation} selectedModels={selectedModels} selectedYear={selectedYear} selectedStationData={selectedStationData} displayModel={displayModel}/>
            : null}


            {(selectedStationData.length > 0)?
                <div>
                    {/* <FormControl style={{marginLeft: "20px", marginBottom: "20px"}}>
                        <InputLabel shrink>Display Station HeatMap + BarChart: </InputLabel>
                        <NativeSelect onChange={(e) => setSelectedStationHM(e.target.value)} style={{width: "300px"}}>
                            {selectedStation.map(x => <option value={x} key={x}>{x}</option>)}
                        </NativeSelect>
                    </FormControl> 
                    prediction={selectedStationData.filter(x => +x[2] === +selectedStationHM)[0][0]} groundTruth={selectedStationData.filter(x => +x[2] === +selectedStationHM)[0][1]}
                    prediction={selectedStationData.filter(x => +x[2] === +selectedStationHM)[0][0]} groundTruth={selectedStationData.filter(x => +x[2] === +selectedStationHM)[0][1]}
                    */}
                    <Barchart key={"bc"} selectedStation={selectedStation} selectedModels={selectedModels} selectedYear={selectedYear} selectedStationData={selectedStationData}/>
                    <br/>
                    <Heatmap key={"hm"} selectedStation={selectedStation} selectedModels={selectedModels} selectedYear={selectedYear} selectedStationData={selectedStationData}/>
                </div>
            : null}
            
        </div>
    </div>
    )
}


export default Mainfilter;


