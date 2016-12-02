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
  const categories = data.reduce((uniqueCategories, datum) => {
    const trimmedCategory = datum.Category.trim();
    if (uniqueCategories.indexOf(trimmedCategory) === -1) {
      uniqueCategories.push(trimmedCategory);
    }
    return uniqueCategories;
  }, []);

  populateCategoryList(categories);
  window.generateMap(getDataGivenRenderMode(data), categories);
  categories.forEach(category => {
    const svg = generateSVG();
    generateSmallMultiple(data, category, svg, true);
  });

  addPerCapita(data);
}

function populateCategoryList(categories) {
  d3
    .select('#chooseCategoryForMap')
    .selectAll('option')
    .data(categories)
    .enter()
    .append('option')
      .attr('value', d => d)
      .text(d => d);

  $('#chooseCategoryForMap').chosen({width: '200px'});
}

function generateSmallMultiple(data, chosenCategory, svg, shouldModifyData) {
  svg
    .append('text')
    .text(`Total Spending on ${chosenCategory}`)
    .attr({
      x: 15,
      y: 15,
      width: 100,
      height: 100
    });

  const dataForChart = shouldModifyData ? getDataGivenRenderMode(data) : data;
  const myChart = new dimple.chart(svg, getDataGivenRenderMode(data));
  if (chosenCategory !== 'All') {
    myChart.data = dimple.filterData(dataForChart, 'Category', chosenCategory);
  }
  const x = myChart.addCategoryAxis('x', ['State']);
  x.title = null;

  const yAxis = myChart.addMeasureAxis('y', 'Total Budget');
  yAxis.showGridlines = false;
  yAxis.fontSize = '12px';
  yAxis.title = null;
  const ySeries = myChart.addSeries('Category', dimple.plot.bar);
  myChart.draw(800);
}

function addPerCapita(data) {
  $('#perCapita')
    .one('click', (e) => {
      renderMode = e.target.checked ? 'perCapita' : 'absolute';
      $('#containerForMap, #containerForSmallMultiples').empty();
      draw(data);
    });

  d3
    .selectAll('.dimple-bar')
    .on('click', function () {
      doFunStuffWithChartBar(d3.select(this));
    })
}

function doFunStuffWithChartBar(bar) {
  const rand = Math.floor((Math.random() * 2) + 1);
  switch (rand) {
    case 1:
      spinBarAround(bar, 360, 0);
      break;
    default:
      bounceBar(bar);
      break;
  }
}

function bounceBar(bar) {
  const rand = Math.floor((Math.random() * 30) + 1);
  bar.transition()
      .duration(1500)
      .ease('cubic-in')
      .attr('transform','translate(' + (bar.attr('width') * rand) + ',' + (bar.attr('height') * 0.8) + '), scale(1.0,1.0)')
      .transition()
      .ease('cubic-out')
      .duration(1500)
      .attr('transform','translate(0,0), scale(1.0,1.0)')
}

function spinBarAround(bar, start, finish) {
  const rotTween = () => {
    const i = d3.interpolate(start, finish);
    return t => {
      return `rotate(${i(t)},100,100)`;
    };
  };

  bar
    .transition().duration(2000)
    .attrTween('transform', rotTween);
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
      const category = bar.key.substring(0, bar.key.indexOf('_')).trim();
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
  const margin = 100;
  const width = 440 - margin;
  const height = 370 - margin;

  const svg = d3.select('#containerForSmallMultiples')
    .insert('svg', '#disclaimer')
      .attr('width', width + margin)
      .attr('height', height + margin)
      .append('g')
        .attr('class','chart');

  return svg;
}

d3.tsv('govspendingdata.tsv', draw);
