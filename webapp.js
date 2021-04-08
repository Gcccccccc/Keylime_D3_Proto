async function populateAgentsForPie() {
  // "/v"+API_VERSION+"/"+res+"/"+resId
  let response = await fetch(`/v${API_VERSION}/agents/`);
  let json = await response.json();
  if (!("results" in json)) {
    reportIssue("ERROR populateAgents: Malformed response for agent list refresh callback!");
    return;
  }
  response = json["results"];

  // Figure out which agent id we refer to
  if (!("uuids" in response)) {
    reportIssue("ERROR populateAgents: Cannot get uuid list from callback!");
    return;
  }

  // Get list of agent ids from server
  let agentIds = response["uuids"];

  console.log(agentIds);

  // status array
  let status_array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  // sunburst chart data
  let data = {
    "name": "agents sunburst chart",
    "children": [
      // {
      //   "name": "registered",
      //   "children": [
      //   ]
      // },
      // {
      //   "name": "validated",
      //   "children": [
      //   ]
      // },
      // {
      //   "name": "invalidated",
      //   "children": [
      //   ]
      // }
    ]
  }
  // initialize status_array
  for (let i = 0; i <= 10; i++) {
    data['children'].push({
      "name": STR_MAPPINGS[i],
      "children": []
    })
  }

  // collect visualization data for pie chart and sunburst chart
  for (let i = 0; i < agentIds.length; i++) {
    let agentResponse = await fetch(`/v${API_VERSION}/agents/${agentIds[i]}`);
    let responseText = await agentResponse.json();
    let ss = responseText["results"]["operational_state"];
    let uuid = responseText["results"]["id"];
    l.push(responseText);
    status_array[ss]++;
    data['children'][ss]['children'].push({
      "id": uuid
    })
  }

  console.log(l);
  google.charts.load("current", {packages:["corechart"]});
  google.charts.setOnLoadCallback(drawChart);
  function drawChart() {
    console.log(Registered, Start, GQ, Invalid);
    var data = google.visualization.arrayToDataTable([
      ['Status', 'status'],
      ['Registered', status_array[0]],
      ['Start', status_array[1]],
      ['Saved', status_array[2]],
      ['Get Quote', status_array[3]],
      ['Get Quote (retry)', status_array[4]],
      ['Provide V', status_array[5]],
      ['Provide V (retry)', status_array[6]],
      ['Failed', status_array[7]],
      ['Terminated', status_array[8]],
      ['Invalid Quote', status_array[9]],
      ['Tenant Quote Failed', status_array[10]]
    ]);

    var options = {
      title: 'Agents Status Pie Chart',
      pieHole: 0.4,
      titleTextStyle: {
        fontSize: 25
      },
      colors:['#BEBEBE', '#FFFF00', 'black', '#88FF99', 'black', 'black', 'black', 'black', 'black', '#FF6666', 'black'],
      pieSliceTextStyle: {fontSize: 18},
      legend: {
        textStyle: {
          fontSize: 20
        }
      }
    };
    var chart = new google.visualization.PieChart(document.getElementById('donutchart'));
    function selectHandler() {
      var selectedItem = chart.getSelection()[0];
      if (selectedItem) {
        var topping = data.getValue(selectedItem.row, 0);
        alert('The user selected ' + topping);
      }
    }

    google.visualization.events.addListener(chart, 'select', selectHandler);
    chart.draw(data, options);
  }

  // render sunburst chart
  width = 350
  radius = width / 6
  arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius(d => d.y0 * radius)
      .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))
  format = d3.format(",d")

  // colorArray = d3.interpolate("rgb(144, 238, 144)", "rgb(255, 107, 107)", "rgb(211, 211, 211)")
  // console.log(colorArray)
  // color = d3.scaleOrdinal(d3.quantize(colorArray, 3))
  // console.log(color)

  color = (d) => {
    while (d.depth > 1)
      d = d.parent;
    if (d.data.name == "Registered") {
      return "rgb(111, 111, 111)";
    } else if (d.data.name == "Get Quote") {
      return "rgb(29, 176, 0)";
    } else if (d.data.name == "Invalid Quote") {
      return "rgb(219, 2, 2)";
    } else if (d.data.name == "Start") {
      return "rgb(255, 255, 0)";
    } else {
      return "black";
    }
  }
  partition = data => {
    const root = d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
    return d3.partition()
        .size([2 * Math.PI, root.height + 1])
      (root);
  }

  const root = partition(data);

  root.each(d => d.current = d);

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, width])
      .style("font", "10px sans-serif")
      .style("width", "70%")
      .style("height", "70%");

  const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${width / 2})`);

  const path = g.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
      .attr("fill", d => { return color(d); })
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("d", d => arc(d.current));

  path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

  path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.id)}`);

  const label = g.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", d => +labelVisible(d.current))
      .attr("transform", d => labelTransform(d.current))
      .text(d => d.data.name);

  const parent = g.append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

  function clicked(event, p) {
    parent.datum(p.parent || root);

    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });

    const t = g.transition().duration(750);

    // Transition the data on all arcs, even the ones that aren’t visible,
    // so that if this transition is interrupted, entering arcs will start
    // the next transition from the desired position.
    path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
      .filter(function(d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
        .attrTween("d", d => () => arc(d.current));

    label.filter(function(d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      }).transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current));
  }

  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  $('body').append(svg.node())

}