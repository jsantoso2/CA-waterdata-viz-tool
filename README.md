### Directory
```
├── public
    ├── data
    |   ├── stations.csv (CSV list of station)    
    |   ├── 9423350.csv (Actual Data with for Station ID 9423350 3 columns {Date, StreamFlow, AutoEncoder})
    |   ├── 10253100.csv
    |   ├── prediction9423350.csv (Prediction Data with for Station ID 9423350 3 columns {Date, yhat, index (Model Name)})
    |   ├── prediction10253100.csv
    |   ├── ...
├── src
    |   ├── app.js (Main File)
    |   ├── components
    |   |   ├── barchart.js (Barchart component to generate barchart)
    |   |   ├── header.js (This is where the header component)
    |   |   ├── heatmap.js (heatmap component)
    |   |   ├── layoutmatricesmeanmajority.js (Dr. Jose's modified code NOT working)
    |   |   ├── layoutmatricesregular.js (Dr. Jose's modified code - Working)
    |   |   ├── linechartcontractors.js (Linechart for contractors on map)
    |   |   ├── linechartmultiple.js (Brushchart/Linechart component)
    |   |   ├── maincomponent.js (This is where the main code is)  
    |   |   ├── mainfilter.js (This is where all the home page is rendered)    
    |   |   ├── usePrevious.js (used in brushchart/linechart component)
    |   |   ├── ...
    |   ├── geojson_data
    |   |   ├── CACounties.json
    |   |   ├── CAPowerPlants.json
    |   |   ├── CAUrbanArea.json
    |   |   ├── Contractors.json
    |   |   ├── ServiceAreasTemp.json
    |   |   ├── SWPPath.json
    |   |   ├── ws1, ws2, ws3, ws4.json
```

### To Run App
1. Install dependencies should be in package.json (npm install xxxx)
2. go to main folder (CA-waterdata-viz-tool)
3. type npm start

### Main Screen
Markup : ![picture alt](https://github.com/jsantoso2/CA-waterdata-viz-tool/blob/main/screenshots/homepage.JPG)
- Users can click on one or multiple stations (up to two), select year from range (start and end year), select none/multiple models, select display method to be average (all model prediction are averaged and displayed only by one line) / all (individual models displayed by its own linechart) for linechart display

### Charts
1. Line Chart
Markup : ![picture alt](https://github.com/jsantoso2/CA-waterdata-viz-tool/blob/main/screenshots/linechart.JPG)
- Description: Line chart that display trends for all selected station, based on the selected year ranges. Can display individual models/average for prediction.
- Interaction: User can drag brush to zoom in/out on line chart, drag slider to see only 1 year, zoom in on line chart, hover to show tooltip and horizontal barchart.

2. Barchart
Markup : ![picture alt](https://github.com/jsantoso2/CA-waterdata-viz-tool/blob/main/screenshots/barchart.JPG)
- Description: Bar chart that shows actual and predicted streamflow for one station in one year
- Interaction: Select different year and stations

3. Heatmap for Actual/Pred vs Actual/Pred for one year
Markup : ![picture alt](https://github.com/jsantoso2/CA-waterdata-viz-tool/blob/main/screenshots/heatmap.JPG)
- Description: Heatmap where users can see how weeks/months prediction compare to one another 
- Interaction: tooltip on hover, dynamically changing axis and aggregation, click on box to display another heatmap with breakdown by day. 

4. Matrix
Markup : ![picture alt](https://github.com/jsantoso2/CA-waterdata-viz-tool/blob/main/screenshots/Matrix.JPG)
- Original Code done by Dr. Jose
- Other file was not working (layoutmatricesmeanmajority)

### To Get Started with React
```
npx create-react-app CA-waterdata-viz-tool
cd CA-waterdata-viz-tool
npm start
```
https://reactjs.org/docs/create-a-new-react-app.html
