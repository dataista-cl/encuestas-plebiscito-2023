const windowWidth = window.innerWidth;

const width = windowWidth * 0.7;
const height = width * 0.5;

const margin = {
    left: 60,
    right: 170,
    top: 10,
    bottom: 70
};

const svg = d3.select("#viz-aprobacion-gabriel-boric").append("svg")
    .attr("width", width)
    .attr("height", height);

const xAxis = svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + (height - margin.bottom) + ")");

const yAxis = svg.append("g")
    .attr("class", "axis axis--y")
    .attr("transform", "translate(" + margin.left + ",0)");

const xLabel = xAxis.append("g")
    .append("text")
    .attr("class", "x axis-title")
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .attr("fill", "black")
    .attr("transform", `translate(${(width - margin.right) / 2}, 25)`);

const yLabel = yAxis.append("g")
    .append("text")
    .attr("class", "y axis-title")
    .attr("text-anchor", "end")
    .style("font-size", "10px")
    .attr("fill", "black")
    .attr("transform", `translate(10, ${margin.top}) rotate(-90)`);

Promise.all([
  d3.csv("data/encuestas_plebiscito_2023.csv"),
  d3.json("js/es-ES.json")
]).then(function(data){

  const gb = data[0];

  d3.timeFormatDefaultLocale(data[1]);

  const parseTime = d3.timeParse("%e–%b");

  gb.forEach(d => {
    d['a favor'] = +d['a favor'];
    d['en contra'] = +d['en contra'];
    d.nsnr = +d.nsnr;
    d.casos = +d.casos;
    d.fecha = parseTime(d.fecha);
  });

  const aprueba = gb.map(d => {
    return {
      "encuesta": d.encuesta,
      "fecha": d.fecha,
      "valor": d['a favor'],
      "peso": Math.round(d.casos * d['a favor'] / 100),
      "normalizado": d['a favor'] / (d['a favor'] + d['en contra'])
    }
  });

  const desaprueba = gb.map(d => {
    return {
      "encuesta": d.encuesta,
      "fecha": d.fecha,
      "valor": d['en contra'],
      "peso": Math.round(d.casos * d['en contra'] / 100),
      "normalizado": d['en contra'] / (d['a favor'] + d['en contra'])
    }
  });
  console.log(aprueba)

  const x = 'fecha';
  const yDots = 'valor';
  const yLine = 'promedio';
  const circleRadius = 3,
    circleOpacity = 0.7;
  const movingWindow = 3;

  const lines = [aprueba, desaprueba];

  const xMin = d3.min(lines.map(d => d3.min(d, v => v[x])));
  const xMax = d3.max(lines.map(d => d3.max(d, v => v[x])));
  const yMin = 0;
  const yMax = 70;

  const movingAverage = (array, window, valueField, weightField) => {
    let mvAvg = [];
    for (let idx = 0; idx < array.length; idx++) {
      const halfWindow = Math.floor(window / 2)
      const leftIdx = Math.max(0, idx - halfWindow);
      const rightIdx = Math.min(array.length - 1, idx + halfWindow);
      const thisSlice = array.slice(leftIdx, rightIdx + 1);
      const num = thisSlice.reduce((a,b) => b[valueField] * b[weightField] + a, 0);
      const den = thisSlice.reduce((a,b) => b[weightField] + a, 0);
      array[idx].promedio = num / den;
    }
  }

  movingAverage(aprueba, movingWindow, yDots, 'peso');
  movingAverage(desaprueba, movingWindow, yDots, 'peso');


  const xScale = d3.scaleTime()
    .range([margin.left, width - margin.right])
    .domain([xMin, xMax]);

  const yScale = d3.scaleLinear()
    .range([height - margin.bottom, margin.top])
    .domain([yMin, yMax]);

  const line = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => xScale(d[x]))
    .y(d => yScale(d[yLine]));

  xAxis.call(
    d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%d %B"))
        .ticks(d3.timeMonth.every(2))
  );
  yAxis.call(d3.axisLeft(yScale).tickFormat(d => d + '%'));
  // xLabel.text(x);
  // yLabel.text(yDots);

  svg.selectAll("circle .aprueba")
      .data(aprueba.filter(d => d.encuesta === 'Cadem'))
      .join("circle")
        .attr("class", "aprueba")
        .attr("cx", d => xScale(d[x]))
        .attr("cy", d => yScale(d[yDots]))
        .attr("r", circleRadius)
        .style("opacity", circleOpacity)
        .style('fill', 'darkgreen');

  svg.selectAll("circle .desaprueba")
    .data(desaprueba.filter(d => d.encuesta === 'Cadem'))
    .join("circle")
      .attr("class", "desaprueba")
      .attr("cx", d => xScale(d[x]))
      .attr("cy", d => yScale(d[yDots]))
      .attr("r", circleRadius)
      .style("opacity", circleOpacity)
      .style('fill', 'pink');

  svg.selectAll("rect .aprueba")
      .data(aprueba.filter(d => d.encuesta === 'Activa'))
      .join("rect")
        .attr("class", "aprueba")
        .attr("x", d => xScale(d[x]) - circleRadius)
        .attr("y", d => yScale(d[yDots]) - circleRadius)
        .attr("width", 2 * circleRadius)
        .attr("height", 2 * circleRadius)
        .style("opacity", circleOpacity)
        .style('fill', 'darkgreen');

  svg.selectAll("rect .desaprueba")
    .data(desaprueba.filter(d => d.encuesta === 'Activa'))
    .join("rect")
      .attr("class", "desaprueba")
      .attr("x", d => xScale(d[x]) - circleRadius)
      .attr("y", d => yScale(d[yDots]) - circleRadius)
      .attr("width", 2 * circleRadius)
      .attr("height", 2 * circleRadius)
      .style("opacity", circleOpacity)
      .style('fill', 'pink');

  const curves = svg.selectAll(".curve")
      .data(lines)
      .join("path")
        .attr("class", "curve")
        .attr("fill", "none")
        .attr("stroke-width", 2.0)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .style("mix-blend-mode", "multiply")
        .style("opacity", 1.0)
        .attr("stroke", (_, i) => i === 0 ? 'darkgreen' : 'pink')
        .attr("d", d => line(d));

  svg.selectAll(".label")
    .data(lines.map(d => d[d.length - 1]))
    .join("text")
      .attr("class", "label")
      .attr("x", d => xScale(d[x]) + 10)
      .attr("y", d => yScale(d[yLine]) + 5)
      .attr("fill", (_, i) => i === 0 ? 'darkgreen' : 'pink')
      .attr("stroke", (_, i) => i === 0 ? 'darkgreen' : 'pink')
      .text((d,i) => i === 0 ? `A favor ${d[yLine].toFixed(1)}%` : `En contra ${d[yLine].toFixed(1)}%`);

})
