### Directory
```
├── public
    ├── data
    |   ├── 9423350.csv
    |   ├── 10253100.csv
    |   ├── prediction9423350.csv
    |   ├── prediction10253100.csv
    |   ├── ...
├── src
    |   ├── app.js (Main File)
    |   ├── components
    |   |   ├── maincomponent.js (Second main file -> can place router here)
    |   |   ├── mainfilter.js (This is where all the code is for the home page)
    |   |   ├── header.js (header compoenent)
    |   |   ├── heatmap.js (heatmap component)
    |   |   ├── linechartmultiple.js (linechart compoenent - DONE)
    |   |   ├── stackedbar.js (Maybe not used)
    |   |   ├── layoutmatricesregular.js (Converted from original code)
    |   |   ├── layoutmatricesmeanmajority.js (Converted from original code)
    |   |   ├── usePrevious.js (used in linechart component)
    |   |   ├── ...
```

### To Run App
1. Install dependencies should be in package.json (npm install xxxx)
2. go to main folder (CA-waterdata-viz-tool)
3. type npm start

### Charts
1. Line Chart
<img src="https://github.com/jsantoso2/CA-waterdata-viz-tool/blob/main/screenshots/linechart.JPG" width = 600 height=300/>

- Description: Line chart that display trends for all selected station, based on the selected year ranges.
- Interaction: User can drag brush to zoom in/out on line chart, drag slider to see only 1 year, zoom in on line chart

2. Heatmap for Actual/Pred vs Actual/Pred for one year
<img src="https://github.com/jsantoso2/CA-waterdata-viz-tool/blob/main/screenshots/heatmap.JPG" width = 600 height=300/>
- Description: Heatmap where users can see how weeks/months prediction compare to one another 
- Interaction: tooltip on hover, dynamically changing axis and aggregation 

### To Get Started with React
```
npx create-react-app CA-waterdata-viz-tool
cd CA-waterdata-viz-tool
npm start
```
https://reactjs.org/docs/create-a-new-react-app.html
