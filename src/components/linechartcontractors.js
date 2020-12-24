import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';


function LineChartContractors(props) {

    const svgRef = useRef();
    var data = props.historical;

    const height = 150;
    const width = 300;
    const padding = 35;

    const years = ["2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018"];


    useEffect(() => {
        // d3 linechar code here
        const svg = d3.select(svgRef.current); 

        d3.selectAll("#circle").remove();

        if (data.length > 0){

            const xScale = d3.scaleBand()
                            .domain(["2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018"])
                            .range([padding, width]);
            
            const yScale = d3.scaleLinear()
                             .domain([0, d3.max(data, function(d){ return d})])
                             .range([height - padding / 2, padding / 4]);
            
            
            // Define axes
            var xAxis = d3.axisBottom()
                            .scale(xScale);
            var yAxis = d3.axisLeft()
                          .scale(yScale)
                          .ticks(5)
                          .tickFormat(function (d) {
                            if ((d / 1000000) >= 1){
                                d = d / 1000000 + "M"
                            } else if ((d / 1000) >= 1) {
                              d = d / 1000 + "K";
                            } 
                            return d;
                           });
            
             // line generator
             var line = d3.line()
                            .x(function(d, i) { return xScale(years[i]) + xScale.bandwidth() / 2})
                            .y(function(d){ return yScale(d)});
            
            // line
            svg.selectAll("#line")
                .data([data])
                .join("path")
                .attr("d", value => line(value))
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("id", "line");
            
            // circles
            svg.selectAll("#circle")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("cx", function(d, i){ return xScale(years[i]) + xScale.bandwidth()/2})
                    .attr("cy", function(d){ return yScale(d)})
                    .attr("r", 3)
                    .attr("fill", "red")
                    .attr("stroke", "red")
                    .attr("id", "circle");         
            
            // Create axes
			svg.select(".x-axis")
                .attr("transform", "translate(0," + (height - padding / 2) + ")")
                .call(xAxis);

            svg.select(".y-axis")
                .attr("transform", "translate(" + (padding) + ",0)")
                .call(yAxis);
            
            

        }


    }, [data])

    return (
        <div>
            <h3>Historical Quotas</h3>
            <svg ref={svgRef} width={width} height={height}>
                <g className="x-axis"></g>
                <g className="y-axis"></g>
            </svg>
        </div>
    )
}

export default LineChartContractors;
