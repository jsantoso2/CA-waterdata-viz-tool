import React from 'react';
import Mainfilter from './mainfilter';
// import Header from './header';
// import Barchart from './barchart';
// import LinechartMultiple from './linechartmultiple';

import {BrowserRouter as Router, Switch, Route, Redirect} from 'react-router-dom';


function Main() {
    return (
        <div>
            <Router>
                <Switch>
                    <Route exact path="/" component={() => <Mainfilter/>} />
                    {/* <Route path="/linechart" component={() => <LinechartMultiple />} />
                    <Route path="/barchart" component={() => <Barchart />} /> */}
                    <Redirect to ='/'/>
                </Switch>
            </Router>
        </div>
    );
}

export default Main;
