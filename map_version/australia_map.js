const STATE_MAPPING = {
  'Northern Territory': 'NT',
  'Victoria': 'VIC',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Australian Capital Territory': 'ACT',
  'Queensland': 'QLD',
  'New South Wales': 'NSW',
  'Tasmania': 'TAS'
};

window.generateMap = (data, categories) => {

  const chosenCategory = 'All';
  const dataForThisCategory = getDataForChosenCategory(chosenCategory, data);
  const width = 500;
  const height = 400;
  const svg = d3
    .select('#containerForMap')
    .insert('svg', '#disclaimer')
    .attr('width', width)
    .attr('height', height);

  let myChart, geoJSONFeatures;

  d3.json('au-states.geojson', function(collection) {
    geoJSONFeatures = collection.features;
    drawMap(dataForThisCategory, geoJSONFeatures, svg, data);
  });

  $('#chooseCategoryForMap')
    .on('change', function (changedEl) {
      const chosenCategory = this.value;
      const newData = getDataForChosenCategory(chosenCategory, data);
      svg.selectAll('*').remove();
      drawMap(newData, geoJSONFeatures, svg, data);
      generateSmallMultiple(data, chosenCategory, generateSVGForStateDrilldown(), false);
    });
}

function drawMap(dataForThisCategory, geoJSONFeatures, svg, data) {
  const states = svg
    .append('g')
    .attr('id', 'states');

  const fill = d3.scale.log()
      .domain(d3.extent(d3.values(dataForThisCategory)))
      .range(['#ecf0f1', '#2ecc71']);

  const projection = d3.geo.azimuthal()
      .origin([135, -26])
      .translate([250,180])
      .scale(700);

  const path = d3.geo.path()
      .projection(projection);

  const tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(d => {
      const stateAbbrev = STATE_MAPPING[d.properties['STATE_NAME']];
      const totalBudgetForThisState = (dataForThisCategory[stateAbbrev] || 0).toFixed(2);
      return `<strong>State:</strong> <span>${stateAbbrev}</span><br/>
        <strong>Total Budget:</strong> <span>$${totalBudgetForThisState}</span>`;
    });
  svg.call(tip);

  states
    .selectAll('path')
    .data(geoJSONFeatures)
    .enter().append('path')
    .attr('state', d => d.properties['STATE_NAME'])
    .attr('fill', d => {
      const stateAbbrev = STATE_MAPPING[d.properties['STATE_NAME']];
      return fill(dataForThisCategory[stateAbbrev]);
    })
    .attr('stroke', 'white')
    .attr('d', path)
    .on('click', (d) => {
      d3
        .selectAll('path[state]')
        .attr('fill', d => {
          const stateAbbrev = STATE_MAPPING[d.properties['STATE_NAME']];
          return fill(dataForThisCategory[stateAbbrev]);
        });

      const chosenState = d3.select(`path[state="${d.properties['STATE_NAME']}"]`);
      chosenState.attr('fill','#3498db');
      const stateAbbrev = STATE_MAPPING[d.properties['STATE_NAME']];
      addDetailChartForState(data, stateAbbrev);
    })
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide)
}

function addDetailChartForState(data, state) {
  const svg = generateSVGForStateDrilldown();
  svg
    .append('text')
    .text(`Total Spending for ${state} across top ten categories`)
    .attr({
      x: 65,
      y: 15,
      width: 100,
      height: 100
    });

  const NUM_JURISDICTIONS = 9;
  const totalSpendInAllStates = data.reduce((summaryData, datum) => {
    summaryData[datum.Category] = (summaryData[datum.Category] || 0) + parseFloat(datum['Total Budget']);
    return summaryData;
  }, {});
  const averageSpendInAllStates = Object.keys(totalSpendInAllStates).reduce((summaryData, category) => {
    summaryData[category] = totalSpendInAllStates[category] / NUM_JURISDICTIONS;
    return summaryData
  }, {});
  const filteredDataMap = dimple.filterData(data, 'State', state).reduce((summaryData, datum) => {
    const totalBudgetForThisCategory = (summaryData[datum.Category] || {'Total Budget': 0})['Total Budget'] + parseFloat(datum['Total Budget']);
    summaryData[datum.Category] = {
      Category: datum.Category,
      State: datum.State,
      'Total Budget': totalBudgetForThisCategory
    };
    return summaryData;
  }, {});
  const top10Categories = Object.keys(filteredDataMap).sort((a, b) => {
    return filteredDataMap[b]['Total Budget'] - filteredDataMap[a]['Total Budget'];
  }).slice(0, 10);

  const filteredDataArrayWithAverage = Object.keys(filteredDataMap)
    .reduce((result, key) => {
      if (top10Categories.indexOf(key) > -1) {
        const datum = filteredDataMap[key];
        result.push(datum);
        result.push(Object.assign({}, datum, {
          State: 'Average',
          'Total Budget': averageSpendInAllStates[datum.Category]
        }));
      }
      return result;
    }, []);

  const myChart = new dimple.chart(svg, filteredDataArrayWithAverage);
  myChart.defaultColors = [
    new dimple.color("#2980b9", "#2980b9", 1), // orange
  ];
  const yAxis = myChart.addCategoryAxis('y', ['Category', 'State']);
  yAxis.fontSize = '14px'
  yAxis.title = null;

  const xAxis = myChart.addMeasureAxis('x', 'Total Budget');
  xAxis.fontSize = '12px';
  xAxis.showGridlines = false;
  xAxis.title = null;
  const spendingData = myChart.addSeries('State', dimple.plot.bar);
  myChart.addLegend(400, 10, 40, 40);
  myChart.setMargins('200px', '30px', '20px', '20px');
  myChart.draw(1000);
}

function getDataForChosenCategory(chosenCategory, data) {
  return data.reduce((summaryData, datum) => {
    if (datum.Category === chosenCategory || chosenCategory === 'All') {
      summaryData[datum.State] = (summaryData[datum.State] || 0) + parseFloat(datum['Total Budget']);
    }
    return summaryData;
  }, {});
}

function generateSVGForStateDrilldown() {
  const existingMap = d3.select('#stateDrilldownChart');

  if (existingMap[0][0]) {
    existingMap.remove();
  }

  const width = 600;
  const height = 400;

  const svg = d3.select('#containerForMap')
    .append('svg')
      .attr('id', 'stateDrilldownChart')
      .attr('width', width)
      .attr('height', height)
      .append('g')
        .attr('class','chart');

  return svg;
}
