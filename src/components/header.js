import React from 'react';
import logo from '../water-challenge-logo.png';

// Styles and Material UI Imports
import './header.css';
import { Grid } from '@material-ui/core';


function Header() {
    return (
        <div>
        <div className="header">
            <Grid container spacing={0}>
                {/* ############################ Logo ########################### */}
                <Grid item xs={6} sm={5} md={5}>
                    <img className = "header_image" src={logo} alt="logo" />
                </Grid>
                {/* ############################ Welcome Text ########################### */}
                <Grid item xs={6} sm={7} md={7}>
                    <h1 className="header_text">Welcome to the App!</h1>
                </Grid>
            </Grid>
        </div>
        </div>
    )
}

export default Header
