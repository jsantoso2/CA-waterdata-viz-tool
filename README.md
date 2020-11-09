Directory
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
    |   |   ├── heatmap.js (heatmap compoenent - NOT YET DONE (still working on it)
    |   |   ├── linechartmultiple.js (linechart compoenent - DONE)
    |   |   ├── stackedbar.js (Maybe not used)
    |   |   ├── layoutmatricesregular.js (Converted from original code)
    |   |   ├── layoutmatricesmeanmajority.js (Converted from original code)
    |   |   ├── usePrevious.js (used in linechart component)
    |   |   ├── ...
```

To Run App
1. Install dependencies should be in package.json (npm install xxxx)
2. go to main folder (CA-waterdata-viz-tool)
3. type npm start


To Get Started with React
```
npx create-react-app CA-waterdata-viz-tool
cd CA-waterdata-viz-tool
npm start
```
https://reactjs.org/docs/create-a-new-react-app.html