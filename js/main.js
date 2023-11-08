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

  const x = 'fecha';
  const yDots = 'valor';
  const yLine = 'promedio';
  const circleRadius = 3,
    circleOpacity = 0.7;
  const movingWindow = 3;

  const lines = [aprueba, desaprueba];
  const colors = ["#2aad53", "#d934a1"]

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
        .ticks(d3.timeMonth.every(1))
  );
  yAxis.call(
    d3.axisLeft(yScale)
      .tickFormat(d => d + '%')
      .tickValues([0, 10, 20, 30, 40, 50, 60, 70])
  );

  xAxis.selectAll(".domain").remove();
  yAxis.selectAll(".domain").remove()
  yAxis.selectAll(".tick line")
    .attr('x2', width - margin.right - margin.left)
    .attr("stroke", "#d9d9d9");
  xAxis.selectAll(".tick line")
    .attr('y2', margin.top + margin.bottom - height)
    .attr("stroke", "#d9d9d9");
  xAxis.selectAll(".tick text")
    .attr("fill", "#969696")
    .attr("stroke", "none");
  yAxis.selectAll(".tick text")
    .attr("fill", "#969696")
    .attr("stroke", "none");

  svg.selectAll("circle .aprueba")
      .data(aprueba.filter(d => d.encuesta === 'Cadem'))
      .join("circle")
        .attr("class", "aprueba")
        .attr("cx", d => xScale(d[x]))
        .attr("cy", d => yScale(d[yDots]))
        .attr("r", circleRadius)
        .style("opacity", circleOpacity)
        .style('fill', colors[0]);

  svg.selectAll("circle .desaprueba")
    .data(desaprueba.filter(d => d.encuesta === 'Cadem'))
    .join("circle")
      .attr("class", "desaprueba")
      .attr("cx", d => xScale(d[x]))
      .attr("cy", d => yScale(d[yDots]))
      .attr("r", circleRadius)
      .style("opacity", circleOpacity)
      .style('fill', colors[1]);

  svg.selectAll("rect .aprueba")
      .data(aprueba.filter(d => d.encuesta === 'Activa'))
      .join("rect")
        .attr("class", "aprueba")
        .attr("x", d => xScale(d[x]) - circleRadius)
        .attr("y", d => yScale(d[yDots]) - circleRadius)
        .attr("width", 2 * circleRadius)
        .attr("height", 2 * circleRadius)
        .style("opacity", circleOpacity)
        .style('fill', colors[0]);

  svg.selectAll("rect .desaprueba")
    .data(desaprueba.filter(d => d.encuesta === 'Activa'))
    .join("rect")
      .attr("class", "desaprueba")
      .attr("x", d => xScale(d[x]) - circleRadius)
      .attr("y", d => yScale(d[yDots]) - circleRadius)
      .attr("width", 2 * circleRadius)
      .attr("height", 2 * circleRadius)
      .style("opacity", circleOpacity)
      .style('fill', colors[1]);

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
        .attr("stroke", (_, i) => colors[i])
        .attr("d", d => line(d));

  svg.selectAll(".label")
    .data(lines.map(d => d[d.length - 1]))
    .join("text")
      .attr("class", "label")
      .attr("x", d => xScale(d[x]) + 10)
      .attr("y", d => yScale(d[yLine]) + 5)
      .attr("fill", (_, i) => colors[i])
      .attr("stroke", (_, i) => colors[i])
      .text((d,i) => i === 0 ? `A favor ${d[yLine].toFixed(1)}%` : `En contra ${d[yLine].toFixed(1)}%`);

})
