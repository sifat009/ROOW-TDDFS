//Begin a eself-executing anonymous function to move to local scope
(function() {
  //Begin Global variables
  var attrArray = ["Something1", "Something2", "PersonName", "Phone"]; //list of attributes from csv data file

  //Attribute to be diplayed on the bar chart(Fields from csv data file)
  var expressed = attrArray[0];
  //End Global variables

  //Begin script when window loads
  window.onload = setMap();

  //Begine setMap function - (choropleth)
  function setMap() {
    //map frame dimensions
    var width = window.innerWidth * 0.8,
      height = 900;

    //creating svg container for the map
    var map = d3
      .select("body")
      .append("svg")
      .attr("class", "map")
      .attr("width", width)
      .attr("height", height);

    //create Albers equal area conic projection centered on USA

    var projection = d3
      .geoAlbersUsa()
      .scale(1350)
      .translate([width / 2, height / 2]);

    var path = d3.geoPath().projection(projection);

    //use Promises to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/AverageScore.csv")); //loading the csv data file or the attributes file
    promises.push(d3.json("data/States.topojson")); //loading the special data file (States)
    Promise.all(promises).then(callback);

    function callback(data, csvData, states) {
      csvData = data[0];
      states = data[1];

      //Translate USStates back to JSON and adding US States to map
      var usStates = topojson.feature(states, states.objects.States).features;
      usStates = joinData(usStates, csvData);

      //Create the color scale. This part of the script came here after the COlor Scale function was defined,
      var colorScale = makeColorScale(csvData);

      //Add enumeration units to the map. This part of the script came here after the enumeration function was defined.
      setEnumerationUnits(usStates, map, path, colorScale);
    }
  }
  //End of function setMap - choropleth

  //Begine function Joining CSV attributes to the USStates special datasest
  function joinData(usStates, csvData) {
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i = 0; i < csvData.length; i++) {
      var csvstates = csvData[i]; //the current region
      var csvKey = csvstates.NAME; //the CSV primary key

      //loop through geojson regions to find correct region
      for (var a = 0; a < usStates.length; a++) {
        var geojsonProps = usStates[a].properties; //the current region geojson properties
        var geojsonKey = geojsonProps.NAME; //the geojson primary key

        //where primary keys match, transfer csv data to geojson properties object
        if (geojsonKey == csvKey) {
          //assign all attributes and values
          attrArray.forEach(function(attr) {
            if (attr === "PersonName" || attr === "Phone" || attr === "Image") {
              var val = csvstates[attr];
            } else {
              var val = parseFloat(csvstates[attr]); //get csv attribute value
            }
            geojsonProps[attr] = val; //assign attribute and value to geojson properties
          });
        }
      }
    }
    return usStates;
  }
  //End function Joining CSV attributes to the USStates special datasest

  //Begine function to create color scale generator
  function makeColorScale(data) {
    //Picked colors from colorbrwer
    var colorClasses = [
      "#ffffff",
      "#a11208",
      "#590b50",
      "#b8e126",
      "#59c7cf",
      "#496ebf",
      "#49bf8e",
      "#92bf49"
    ];

    //create color scale generator
    var colorScale = d3.scaleThreshold().range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i = 0; i < data.length; i++) {
      var val = parseFloat(data[i][expressed]);
      domainArray.push(val);
    }

    //cluster data using ckmeans clustering algorithm to create natural breaks. This is why we have the Statistic library linked in index html file
    var clusters = ss.ckmeans(domainArray, 7);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d) {
      return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
  }
  //End function to create color scale generator

  // Begine function Setting up the Enumeration.
  function setEnumerationUnits(usStates, map, path, colorScale) {
    //add USStates to map
    var allstates = map
      .selectAll(".allstates")
      .data(usStates)
      .enter()
      .append("path")
      .attr("class", function(d) {
        return "allstates " + d.properties.NAME;
      })
      .attr("d", path)
      .style("fill", function(d) {
        return choropleth(d.properties, colorScale);
      })
      // Added at the later stage when highlight and dehighlight were defined
      .on("mouseover", function(d) {
        highlight(d.properties);
      })
      .on("mouseout", function(d) {
        dehighlight(d.properties);
      })
      .on("mousemove", moveLabel);
    // Add style description
    var desc = allstates
      .append("desc")
      .text('{"stroke": "#000", "stroke-width": "0.5px"}');
  }
  // End function Setting up the Enumeration.

  //Begine function to test for data value and return color
  function choropleth(props, colorScale) {
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == "number" && !isNaN(val)) {
      return colorScale(val);
    } else {
      return "blue";
    }
  }
  //End function to test for data value and return color

  //Begin function to highlight enumeration units and bars
  function highlight(props) {
    //change stroke
    var selected = d3
      .selectAll("." + props.NAME)
      .style("stroke", "blue")
      .style("stroke-width", "3.5");

    setLabel(props);
  }
  //End function to highlight enumeration units and bars

  //Begin function to reset the element style on mouseout
  function dehighlight(props) {
    var selected = d3
      .selectAll("." + props.NAME)
      .style("stroke", function() {
        return getStyle(this, "stroke");
      })
      .style("stroke-width", function() {
        return getStyle(this, "stroke-width");
      });

    function getStyle(element, styleName) {
      var styleText = d3
        .select(element)
        .select("desc")
        .text();

      var styleObject = JSON.parse(styleText);

      return styleObject[styleObject];
    }
    // remove infolabel
    d3.select(".infolabel").remove();
  }
  //End function to reset the element style on mouseout

  //Begin function to create dynamic label
  function setLabel(props) {
    //label content
    var labelAttribute = `
      <h1>${props["NAME"]}</h1>
      <h1>${props["PersonName"]}</h1>
      <h1>${props["Phone"]}</h1>
      `;

    //create info label div
    var infolabel = d3
      .select("body")
      .append("div")
      .attr("class", "infolabel")
      .attr("id", props.NAME + "_label")
      .html(labelAttribute);

    // var regionName = infolabel
    //   .append("div")
    //   .attr("class", "labelname")
    //   .html(props.name);
  }
  //End function to create dynamic label

  //Begin function to move info label with user's mouse
  function moveLabel() {
    //get width of label
    var labelWidth = d3
      .select(".infolabel")
      .node()
      .getBoundingClientRect().width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX;
    y1 = d3.event.clientY;
    x2 = d3.event.clientX - labelWidth;
    y2 = d3.event.clientY;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
      .style("left", x + "px")
      .style("top", y - 100 + "px");
  }
})();
//End a eself-executing anonymous function to move to local scope
