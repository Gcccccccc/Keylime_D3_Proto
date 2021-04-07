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

  let Registered = 0;
  let Start = 0;
  let GQ = 0;
  let Invalid = 0;

  for (let i = 0; i < agentIds.length; i++) {
    let agentResponse = await fetch(`/v${API_VERSION}/agents/${agentIds[i]}`);
    let responseText = await agentResponse.json();
    let ss = responseText["results"]["operational_state"];
    l.push(responseText);
    switch (ss) {
      case 0:
        Registered++;
        break;
      case 1:
        Start++;
        break;
      default:
        break;
    }
  }

  console.log(l);
  google.charts.load("current", {packages:["corechart"]});
  google.charts.setOnLoadCallback(drawChart);
  function drawChart() {
    console.log(Registered, Start, GQ, Invalid);
    var data = google.visualization.arrayToDataTable([
      ['Status', 'status'],
      ['Total', agentIds.length],
      ['Registered', Registered],
      ['Start', Start],
      ['Get Quote', 0],
      ['Invalid Quote', Invalid],
    ]);

    var options = {
      title: 'Agents Status Pie Chart',
      pieHole: 0.4,
      titleTextStyle: {
        fontSize: 25
      },
      colors:['pink', 'lightgrey', 'orange', 'lightgreen', '#ff6b6b'],
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
}