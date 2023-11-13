const windowWidth = window.innerWidth;
const threshold = 500;

const width = windowWidth < threshold ? windowWidth * 0.9 : windowWidth * 0.7;
const height = windowWidth < threshold ? width * 0.8 : width * 0.5;

const margin = {
    left: windowWidth < threshold ? 30 : 60,
    right: windowWidth < threshold ? 80 : 170,
    top: 10,
    bottom: windowWidth < threshold ? 20 : 70
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

const rule = svg.append("g")
    .attr("class", "rule")
    .attr("transform", "translate(" + margin.left + ",0)");

rule.append("line")
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "#252525");

const ruleText = rule.append("text")
    .attr("text-anchor", "start")
    .style("font-size", "10px")
    .style("font-family", "sans-serif")
    .attr("fill", "black")
    .attr('y', margin.top + 16);


window.onclick = function(event) {
  if (!event.target.matches('#encuesta-dropbtn')) {
    var dropdown = document.getElementById("encuesta-content");
    if (dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    }
  }
}

Promise.all([
  d3.csv("data/encuestas_plebiscito_2023.csv"),
  d3.json("js/es-ES.json")
]).then(function(data){

  let plotEncuestas = 'Todas';

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
      "normalizado": d['a favor'] / (d['a favor'] + d['en contra']) * 100
    }
  });

  const desaprueba = gb.map(d => {
    return {
      "encuesta": d.encuesta,
      "fecha": d.fecha,
      "valor": d['en contra'],
      "peso": Math.round(d.casos * d['en contra'] / 100),
      "normalizado": d['en contra'] / (d['a favor'] + d['en contra']) * 100
    }
  });

  const x = 'fecha';
  let yDots = 'valor';
  const yLine = 'promedio';
  const circleRadius = 3,
    circleOpacity = 0.7;
  let movingWindow = 3;
  let porcentaje = 'absoluto';

  const promButtons = d3.select("#promedio-buttons");
  const porcButtons = d3.select("#porcentaje-buttons");

  const updateButtons = () => {
    promButtons.selectAll("span")
      .data(['5', '3', '1'])
      .join('span')
        .html(d => d)
        .on("click", (evt,d) => {
          movingWindow = Number(d);
          updatePlot();
          updateButtons();
        });

    promButtons.selectAll("span").classed('active', d => movingWindow === Number(d))

    porcButtons.selectAll("span")
      .data(['relativo', 'absoluto'])
      .join('span')
        .html(d => d)
        // .attr('class', yDots === 'active')
        .on("click", (evt,d) => {
          porcentaje = d;
          yDots = d === 'absoluto' ? 'valor' : 'normalizado';
          yMin = d === 'absoluto' ? 0 : 10;
          yMax = d === 'absoluto' ? 70 : 90;
          tickValues = d === 'absoluto' ? [0, 10, 20, 30, 40, 50, 60, 70] : [10, 20, 30, 40, 50, 60, 70, 80, 90];
          updatePlot();
          updateButtons();
        });

        porcButtons.selectAll("span").classed('active', d => d === porcentaje)
  }

  updateButtons();

  function getUniquesMenu(df, thisVariable) {

    var thisList = df.map(function(o) {
      return o[thisVariable]
    })
  
    // uniq() found here https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
    function uniq(a) {
        return a.sort().filter(function(item, pos, ary) {
            return !pos || item != ary[pos - 1];
        });
    }
  
    var uniqueList = uniq(thisList);
  
    return uniqueList;
  }

  function addOptions(id, values) {
    var element = d3.select("#"+id);
    var options = element.selectAll("option").data(values);
  
    options.enter().append("a")
      .html(d => d);
  
    options.exit().remove();
  
    return element;
  }

  const encuestas =['Todas', ...getUniquesMenu(aprueba, 'encuesta')];
  let encOpts = addOptions("encuesta-content", encuestas);
  d3.select("#encuesta-dropdown")
    .on("click", function(d){
      document.getElementById("encuesta-content").classList.toggle("show");
    });
  d3.select("#encuesta-dropdown").select(".dropbtn").html('Todas');
  encOpts.selectAll("a").on("click", function(event, d){
    if (d !== plotEncuestas) {
      plotEncuestas = d;
      d3.select("#encuesta-dropdown").select(".dropbtn").html(plotEncuestas);
      updatePlot();
    }
  })

  let lines = plotEncuestas === 'Todas' ? [aprueba, desaprueba] : [aprueba.filter(d => d.encuesta === plotEncuestas), desaprueba.filter(d => d.encuesta === plotEncuestas)];
  const colors = ["#2aad53", "#d934a1"]

  let xMin = d3.min(lines.map(d => d3.min(d, v => v[x])));
  let xMax = d3.max(lines.map(d => d3.max(d, v => v[x])));
  let yMin = 0;
  let yMax = 70;
  let tickValues = [0, 10, 20, 30, 40, 50, 60, 70];

  const movingAverage = (array, window, valueField, weightField) => {
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

  const dates = aprueba.map(v => v.fecha);

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

  const updatePlot = () => {

    filteredAprueba = plotEncuestas === 'Todas' ? aprueba : aprueba.filter(d => d.encuesta === plotEncuestas);
    filteredDesaprueba = plotEncuestas === 'Todas' ? desaprueba : desaprueba.filter(d => d.encuesta === plotEncuestas);

    movingAverage(filteredAprueba, movingWindow, yDots, 'peso');
    movingAverage(filteredDesaprueba, movingWindow, yDots, 'peso');

    lines = [filteredAprueba, filteredDesaprueba];

    xMin = d3.min(lines.map(d => d3.min(d, v => v[x])));
    xMax = d3.max(lines.map(d => d3.max(d, v => v[x])));

    xScale.domain([xMin, xMax]);
    yScale.domain([yMin, yMax]);
    line.x(d => xScale(d[x])).y(d => yScale(d[yLine]));

    xAxis.call(
      d3.axisBottom(xScale)
          .tickFormat(d3.timeFormat("%d %B"))
          .ticks(windowWidth < threshold ? d3.timeMonth.every(2) : d3.timeMonth.every(1))
    );
  
    xAxis.selectAll(".domain").remove();
    xAxis.selectAll(".tick line")
      .attr('y2', margin.top + margin.bottom - height)
      .attr("stroke", "#d9d9d9");
    xAxis.selectAll(".tick text")
      .attr("fill", "#969696")
      .attr("stroke", "none");

    yAxis.call(
      d3.axisLeft(yScale)
        .tickFormat(d => d + '%')
        .tickValues(tickValues)
    );
  
    yAxis.selectAll(".domain").remove()
    yAxis.selectAll(".tick line")
      .attr('x2', width - margin.right - margin.left)
      .attr("stroke", "#d9d9d9");
    yAxis.selectAll(".tick text")
      .attr("fill", "#969696")
      .attr("stroke", "none");
  
    svg.selectAll(".aprueba")
        .data(lines[0])
        .join("circle")
          .attr("class", "aprueba")
          .attr("cx", d => xScale(d[x]))
          .attr("cy", d => yScale(d[yDots]))
          .attr("r", circleRadius)
          .style("opacity", circleOpacity)
          .style('fill', colors[0]);
  
    svg.selectAll(".desaprueba")
      .data(lines[1])
      .join("circle")
        .attr("class", "desaprueba")
        .attr("cx", d => xScale(d[x]))
        .attr("cy", d => yScale(d[yDots]))
        .attr("r", circleRadius)
        .style("opacity", circleOpacity)
        .style('fill', colors[1]);

  
    svg.selectAll(".curve")
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
        .attr("stroke", 'white')
        .attr('stroke-width', 4)
        .style('paint-order', 'stroke fill')
        .text((d,i) => {
          if (windowWidth < threshold) {
            return  i === 0 ? `AF ${d[yLine].toFixed(1)}%` : `EC ${d[yLine].toFixed(1)}%`
          } else {
            return i === 0 ? `A favor ${d[yLine].toFixed(1)}%` : `En contra ${d[yLine].toFixed(1)}%`
          }
          
        });
  
    svg.on('mousemove', moved)
        .on('mouseenter', entered)
        .on('mouseleave', left)
        .on('click', click);
  
    function moved(event) {
        const thisX = d3.pointer(event, this)[0];
  
        if (thisX < width - margin.right) {
          const xm = xScale.invert(thisX);
          const i1 = d3.bisectLeft(dates, xm, 1);
          const i0 = i1 - 1;
          const i = xm - dates[i0] > dates[i1] - xm ? i1 : i0;
  
          const af = lines[0][i].promedio;
          const ec = lines[1][i].promedio;
  
          const textString = af > ec ? 'AF' : af < ec ? 'EC' : 'Empate';
          const textColor = af > ec ? colors[0] : af < ec ? colors[1] : 'black';
          const textDifference = af > ec ? (af - ec).toFixed(1) : af < ec ?(ec - af).toFixed(1) : 0;
  
          rule.style('opacity', 1.0);
  
          rule.select('line')
              .attr("x1", xScale(dates[i]) - margin.left)
              .attr("x2", xScale(dates[i]) - margin.left);
  
          ruleText.attr("x", xScale(dates[i]) - margin.left + 5);
            
          ruleText.selectAll("tspan")
            .data([windowWidth < threshold ? d3.timeFormat("%d de %b")(dates[i]) : d3.timeFormat("%d de %B")(dates[i]), `${textString} +${textDifference}%`])
            .join("tspan")
              .attr("x", xScale(dates[i]) - margin.left + 5)
              .attr("dy", (_,i) => i === 0 ? 0 : 18)
              .attr("class", (_,i) => i === 0 ? 'rule-date' : 'rule-difference')
              .style('fill', (_,i) => i === 0 ? 'black' : textColor)
              .text(d => d);
  
          svg.selectAll(".label")
              .data(lines.map(d => d[i]))
              .join("text")
                .attr("class", "label")
                .attr("x", d => xScale(d[x]) + 10)
                .attr("y", d => yScale(d[yLine]) + 5)
                .attr("fill", (_, i) => colors[i])
                .attr("stroke", 'white')
                .attr('stroke-width', 4)
                .text((d,i) => {
                  if (windowWidth < threshold) {
                    return i === 0 ? `AF ${d[yLine].toFixed(1)}%` : `EC ${d[yLine].toFixed(1)}%`;
                  } else {
                    return i === 0 ? `A favor ${d[yLine].toFixed(1)}%` : `En contra ${d[yLine].toFixed(1)}%`;
                  }
                });
        } else {
          rule.style("opacity", 0.0);
        }     
    };
  
    function entered(event) {
        
    };
  
    function left(event) {
        rule.style("opacity", 0.0);
  
        svg.selectAll(".label")
          .data(lines.map(d => d[d.length - 1]))
          .join("text")
            .attr("class", "label")
            .attr("x", d => xScale(d[x]) + 10)
            .attr("y", d => yScale(d[yLine]) + 5)
            .attr("fill", (_, i) => colors[i])
            .attr("stroke", 'white')
            .attr('stroke-width', 4)
            .text((d,i) => {
              if (windowWidth < threshold) {
                return i === 0 ? `AF ${d[yLine].toFixed(1)}%` : `EC ${d[yLine].toFixed(1)}%`;
              } else {
                return i === 0 ? `A favor ${d[yLine].toFixed(1)}%` : `En contra ${d[yLine].toFixed(1)}%`;
              }
            });
    };
  
    function click(event) {
        
    };
  }
  
  updatePlot();

})
