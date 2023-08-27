import { useEffect, useLayoutEffect, useState } from "react";

import * as d3 from 'd3';
import Geonames from 'geonames.js';
// import Papa from 'papaparse';


function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [_data, setData] = useState([]);
  const [worldPopulation, setWorldPopulation] = useState(0);
  const [year, setYear] = useState('1950');
  async function fetchData() {
    try {
      const response = await d3.csv('/data/population.csv'); // Fetch from the public folder
      return response;
    } catch (error) {
      console.error('Error fetching JSON:', error);
    }
  }

  async function getData() {
    const fetchedData = await fetchData();
    const years = Array.from(new Set(fetchedData.map(item => item.Year))).sort();
    const yearSelect = document.getElementById('select-year');
    if (yearSelect && !yearSelect.options.length) {
      years.forEach((y, i) => {
        yearSelect.options[i] = new Option(`Year: ${y}`, y + '');
      })
    }
    const countryRes = await fetch('/data/CountryContinent.json'); // Fetch from the public folder
    const countryContinentMap = await countryRes.json();
    const _data = fetchedData.map(item => ({ y: item[" Population_Growth_Rate "], x: item[" Population_Density "], radius: item[" Population (000s) "], group: countryContinentMap[item.Country], year: item.Year, country: item.Country }));
    setTimeout(() => {
      setData(_data);
    }, 200);
  }

  async function buildChart() {
    const data = _data.filter(item => item.year === year);
    const population = data.reduce((total, item) => {
      total += item.radius.trim().replace(/,/g, "") * 1;
      return total;
    }, 0);
    setWorldPopulation(population)
    // .map(item => ({ y: item[" Population_Growth_Rate "], x: item[" Population_Density "], radius: item[" Population (000s) "], group: countryContinentMap[item.Country] }))

    // Set up the dimensions of the plot
    const width = isMobile ? 200 : 800;
    console.log(width);
    // const width = 80px;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const labelHeight = 30

    const divElement = d3.select("#scatterplot");
    divElement.selectAll("*").remove();

    // Create an SVG element
    const svg = d3.select("#scatterplot")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom + labelHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleOrdinal()
      .domain(["Asia", "Europe", "Africa", "Americas", "Oceania"])
      .range(d3.schemeCategory10);

    // Set up scales for x and y axes
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(_data, d => d.x)])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(_data, d => d.y)])
      .range([height, 0]);
    // const yScale = d3.scaleLinear()
    //   .domain([-100, 100])
    //   .range([height, 0]);

    const radiusScale = d3.scaleLinear()
      .domain([0, d3.max(_data, d => d.radius)])
      .range([3, 12]);

    // Create circles for each data point
    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", d => radiusScale(d.radius))
      .attr("fill", d => colorScale(d.group))
      .style("cursor", "pointer")
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut);


    const legendData = ["Asia", "Europe", "Africa", "Americas", "Oceania"]; // Legend labels
    const legendWidth = 100; // Width of each legend item
    const legendHeight = 20; // Height of the legend area

    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${-margin.left}, ${height + margin.top})`); // Position below the chart

    // Append legend labels
    const eachLegend = legend.selectAll('g')
      .data(legendData)
      .enter().append("g");

    eachLegend.append('circle')
      .attr('cx', (d, i) => i * legendWidth + legendWidth / 2)
      .attr('cy', legendHeight + 5)
      // .attr("cx", d => xScale(d.x))
      // .attr("cy", d => yScale(d.y))
      .attr("r", 6)
      .attr("fill", d => colorScale(d))
      .attr('text-anchor', 'middle')
      .text(d => d);
    eachLegend.append('text')
      .attr('x', (d, i) => (i * legendWidth + legendWidth / 2) + 40)
      .attr('y', legendHeight + 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text(d => d);

    function handleMouseOver(event, d) {
      d3.select(this).attr("fill", "orange"); // Example: highlight circle on hover

      const tooltip = d3.select(".tooltip");
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`Country: ${d.country} <br> Population: ${d.radius}`)
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    }

    function handleMouseOut() {
      d3.select(this).attr("fill", "steelblue"); // Example: restore original color

      const tooltip = d3.select(".tooltip");
      tooltip.transition().duration(500).style("opacity", 0);
    }

    // Add x and y axes
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale));

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + 30) // Positioned below the x-axis
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#757575')
      .text('Population Density');

    svg.append("g")
      .call(d3.axisLeft(yScale));

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', margin.left - 60) // Positioned left of the y-axis
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#757575')
      .text('Population Growth (%)');

  }
  useEffect(() => {
    getData();
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700); // Adjust the breakpoint as needed
    };

    // Initial check and event listener
    handleResize();
    window.addEventListener('resize', handleResize);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  useEffect(() => {
    buildChart();
    if (!isMobile) {
      populationAreaChart();
    }
  }, [_data])
  function onYearChange(e) {
    setYear(e.target.value + '');
    setTimeout(() => {
      buildChart()
    }, 100);

  }

  function populationAreaChart() {
    let yearlyPopulation = {};
    //const _data = fetchedData.map(item => ({ y: item[" Population_Growth_Rate "], x: item[" Population_Density "], radius: item[" Population (000s) "], group: countryContinentMap[item.Country], year: item.Year, country: item.Country }));
    _data.forEach(item => {
      if (!yearlyPopulation[item.year]) yearlyPopulation[item.year] = 0;
      yearlyPopulation[item.year] += item.radius.trim().replace(/,/g, '') * 1;
    })
    let data = [];
    let y_1950 = yearlyPopulation[1950];
    let y_2021 = yearlyPopulation[2021];
    for (let year in yearlyPopulation) {
      data.push({ year: year, population: yearlyPopulation[year] });
    }

    const divElement = d3.select("#growth-chart");
    divElement.selectAll("*").remove();

    const svg = d3.select('#growth-chart')
      .append('svg')
      .attr('width', '200px')
      .attr('height', '80px')
      .append("g")
      .attr("tranform", "translate(0,0)");

    const margin = { top: 0, right: 0, bottom: 0, left: 0 };
    const width = 200 - margin.left - margin.right;
    const height = 60 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.population)])
      .range([height, 15]);

    const area = d3.area()
      .x(d => x(d.year))
      .y0(height)
      .y1(d => y(d.population));

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.population));


    svg.append('path')
      .datum(data)
      .attr('fill', '#ffe57f')
      .attr('d', area);

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'orange')
      .attr('stroke-width', 1)
      .attr('d', line);




    svg.append('text')
      .attr('x', 0)
      .attr('y', height + 12)
      .attr('text-anchor', 'start')
      .style('font-size', '12px')
      .text('1950');

    svg.append('text')
      .attr('x', 0)
      .attr('y', y(y_1950) - 5)
      .attr('text-anchor', 'start')
      .style('font-size', '12px')
      .text(convertPopulation(y_1950));
    svg.append('text')
      .attr('x', width)
      .attr('y', height + 12)
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .text('2021');
    svg.append('text')
      .attr('x', width)
      .attr('y', y(y_2021) - 5)
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .text(convertPopulation(y_2021));

  }
  function convertPopulation(value) {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(2) + ' bn'; // Convert to billions
    } else {
      return (value / 1000000).toFixed(2) + ' mn'; // Convert to millions
    }
  }
  return (
    <>
      <nav className="top-navbar">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="abc">ABC</div>
          <div className="co">CO</div>
        </div>
      </nav>
      <div>
        <div className="select-container">
          <select id="select-year" onChange={onYearChange}></select>
        </div>
        <div className="kpi-container">
          <div className="kpi">
            <div className="kpi-label">World Population</div>
            <div className="kpi-label">({year})</div>
            <div className="kpi-value">{convertPopulation(worldPopulation)}</div>
          </div>
          {!isMobile && <div className="population-growth" >
            <div className="kpi-label">Population Growth</div>
            <div id="growth-chart"></div>
          </div>}
        </div>
        <h4 style={{ color: '#757575', paddingLeft: '24px' }}>Population Growth Vs Density Correlation</h4>

        <div style={{ paddingLeft: '24px' }} id="scatterplot"></div>
      </div>
      <div className="tooltip"></div>
    </>
  );
}

export default App;
