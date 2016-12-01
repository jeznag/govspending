const populationOfStates = {
  NSW: 7618200,
  VIC: 5938100,
  QLD: 4779400,
  WA: 2591600,
  SA: 1698600,
  TAS: 516600,
  ACT: 390800,
  NT: 244600,
  Federal: 23781200
};

let renderMode = 'perCapita';
let currentDrillDownKey;

function draw(data) {
  const svg = generateSVG();
  const myChart = new dimple.chart(svg, getDataGivenRenderMode(data));
  const x = myChart.addCategoryAxis('x', ['State']);
  x.fontSize = '16px';
  myChart.addMeasureAxis('y', 'Total Budget');
  const ySeries = myChart.addSeries('Category', dimple.plot.bar);
  myChart.axes[1].fontSize = '16px';
  const myLegend = myChart.addLegend(200, 10, 1080, 80, 'right');
  myLegend.fontSize = '18px';
  myChart.draw(300);
  myChart.legends = [];

  addDrillDown(data, myChart);
  addPerCapita(data, myChart);
}

function addPerCapita(data, myChart) {
  d3
    .select('#perCapita')
    .on('click', (el) => {
      renderMode = d3.select('#perCapita')[0][0].checked ? 'perCapita' : 'absolute';
      myChart.data = getDataGivenRenderMode(data);
      myChart.draw(500);
      addDrillDown(data, myChart);
    });
}

function getDataGivenRenderMode(data) {
  return renderMode === 'perCapita' ? getPerCapitaData(data) : data;
}

function getPerCapitaData(data) {
  return data.map(datum => {
    const state = datum.State;
    const populationOfState = populationOfStates[state];
    const newValue = datum['Total Budget'] / populationOfState;
    return Object.assign({}, datum, {
      'Total Budget': newValue
    });
  });
}

function addDrillDown(data, myChart) {
  d3
    .selectAll('g.dimple-legend')
    .on('click', (legendKey) => {
      drillDownData(legendKey.key, data, myChart);
      d3.event.stopPropagation();
    });

  d3
    .selectAll('rect.dimple-bar')
    .on('click', (bar) => {
      const category = bar.key.substring(0, bar.key.indexOf('_'));
      drillDownData(category, data, myChart);
      d3.event.stopPropagation();
    });

  d3
    .select('svg')
    .on('click', () => {
      drillDownData(null, data, myChart);
    });
}

function drillDownData(chosenCategory, data, myChart) {
  const dataToDrillDown = getDataGivenRenderMode(data);
  const shouldShowAllCategories = (myChart.data.length !== dataToDrillDown.length && currentDrillDownKey === chosenCategory) ||
    !chosenCategory;
  if (shouldShowAllCategories) {
    myChart.data = dataToDrillDown;
    currentDrillDownKey = null;
  } else {
    currentDrillDownKey = chosenCategory;
    myChart.data = dimple.filterData(dataToDrillDown, 'Category', chosenCategory);
  }
  myChart.draw(800);
  addDrillDown(data, myChart);
}

function generateSVG() {
  const margin = 400;
  const width = 1400 - margin;
  const height = 1000 - margin;

  const svg = d3.select('body')
    .append('svg')
      .attr('width', width + margin)
      .attr('height', height + margin)
      .append('g')
        .attr('class','chart');

  return svg;
}

d3.tsv('govspendingdata.tsv', draw);
