import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import logo from '../water-challenge-logo.png';
    
// Styles and Material UI Imports
import './header.css';
import { Grid, AppBar, Tabs, Tab, Slide } from '@material-ui/core';
import useScrollTrigger from "@material-ui/core/useScrollTrigger";

function HideOnScroll(props) {
    const { children, window } = props;
    const trigger = useScrollTrigger({ target: window ? window() : undefined });
  
    return (
      <Slide appear={false} direction="down" in={!trigger}>
        {children}
      </Slide>
    );
  }
  
function ElevationScroll(props) {
    const { children, window } = props;
    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0,
        target: window ? window() : undefined,
    });

    return React.cloneElement(children, {
        elevation: trigger ? 4 : 0,
    });
}


function Header(props) {
    const [value, setValue] = useState(0);
    
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    function a11yProps(index) {
        return {
          id: `simple-tab-${index}`,
          'aria-controls': `simple-tabpanel-${index}`,
        };
    }

    return (
        <div>
        <ElevationScroll  {...props}>
            <AppBar>
                <Tabs value={value} onChange={handleChange}>
                    <Tab label="Home" href="#home_container" {...a11yProps(0)}/>
                    <Tab label="Line Chart" href="#linechartmultiple_container" {...a11yProps(1)}/>
                    <Tab label="Bar Chart" href="#barchart_container" {...a11yProps(2)}/>
                    <Tab label="Heat Map" href="#heatmap_container" {...a11yProps(3)}/>
                </Tabs>
            </AppBar>
        </ElevationScroll>
        {/* ########################## Initial Header ##################### */}
        <HideOnScroll {...props}>
            <AppBar>
                <Grid container spacing={0}>
                    {/* ############################ Logo ########################### */}
                    <Grid item xs={6} sm={5} md={5}>
                        <img className = "header_image" src={logo} alt="logo" />
                    </Grid>
                    {/* ############################ Welcome Text ########################### */}
                    <Grid item xs={6} sm={7} md={7}>
                        <h2 className="header_text">Welcome to the App!</h2>
                    </Grid>
                </Grid>
                <Tabs value={value} onChange={handleChange}>
                    <Tab label="Home" href="#home_container" {...a11yProps(0)}/>
                    <Tab label="Line Chart" href="#linechartmultiple_container" {...a11yProps(1)}/>
                    <Tab label="Bar Chart" href="#barchart_container" {...a11yProps(2)}/>
                    <Tab label="Heat Map" href="#heatmap_container" {...a11yProps(3)}/>
                </Tabs>
            </AppBar>
        </HideOnScroll>
      </div>
    )
}

export default Header;