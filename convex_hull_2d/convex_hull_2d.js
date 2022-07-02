
let canvas, ctx;


let points = [{x: 175, y: 200}, {x: 200, y: 225}, {x: 250, y: 175}];
let hullVertices = [];



// ------------------- SHAPES -----------------------------------

function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function strokeCircle(x, y, r) {
    let n_lines = 50;

    ctx.beginPath();

    for(let i = 0; i < n_lines; i++) {
        ctx.moveTo(x + r*Math.cos(2*Math.PI/n_lines * i), y + r*Math.sin(2*Math.PI/n_lines * i));
        ctx.lineTo(x + r*Math.cos(2*Math.PI/n_lines * (i + 1)), y + r*Math.sin(2*Math.PI/n_lines * (i + 1)));
    }

    ctx.stroke();
}


function fillCircle(x, y, r) {
    let n_lines = 50;

    let region = new Path2D();

    region.moveTo(x + r*Math.cos(0), y + r*Math.sin(0));

    for(let i = 1; i < n_lines; i++) {
        region.lineTo(x + r*Math.cos(2*Math.PI/n_lines * (i + 1)), y + r*Math.sin(2*Math.PI/n_lines * (i + 1)));
    }

    region.closePath();

    ctx.fill(region);
}


function vertex(x, y) {
    ctx.fillStyle = "#22dd33";
    fillCircle(x, y, 3);
    strokeCircle(x, y, 3);
    ctx.fillStyle = "black";
}



function strokePolygon(vertices) {
    if(vertices.length > 2) {
        ctx.beginPath();

        for(let i = 0; i < vertices.length - 1; i++) {
            ctx.moveTo(vertices[i].x, vertices[i].y);
            ctx.lineTo(vertices[i+1].x, vertices[i+1].y);
        }

        ctx.moveTo(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y);
        ctx.lineTo(vertices[0].x, vertices[0].y);

        ctx.stroke();
    }
}


function fillConvex(vertices) {
    if(vertices.length > 2) {
        let region = new Path2D();

        region.moveTo(vertices[0].x, vertices[0].y);


        for(let i = 1; i < vertices.length; i++) {
            region.lineTo(vertices[i].x, vertices[i].y);
        }


        region.closePath();

        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#2233ee";
        ctx.fill(region);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#000";
    }
}

// --------------------------------------------------------------



// ------------------------ Events -----------------------------

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}
// -------------------------------------------------------------



let float_epsilon = 0.001


function aboveOrOnLine(p1, p2, other) {
	let u = (other.x - p1.x) / (p2.x - p1.x);
	let lineY = p1.y + (p2.y - p1.y) * u;

	if(Math.abs(lineY - other.y) < float_epsilon) {
		// other is collinear with p1 and p2
		return true;
	}else {
		// is other above the line through p1 and p2
		// Y is inverted so check it kinda backwards
		if(lineY - other.y > 0) {
			return true;
		}
	}

	return false;
}

function belowOrOnLine(p1, p2, other) {
	let u = (other.x - p1.x) / (p2.x - p1.x);
	let lineY = p1.y + (p2.y - p1.y) * u;

	if(Math.abs(lineY - other.y) < float_epsilon) {
		// other is collinear with p1 and p2
		return true;
	}else {
		// is other below the line through p1 and p2
		// Y is inverted so check it kinda backwards
		if(other.y - lineY > 0) {
			return true;
		}
	}

	return false;
}


function rightOfLine(origin, destination, other) {
	// Handle the case that the vector from origin to destination is Vertical
	if(Math.abs(origin.x - destination.x) < float_epsilon) {
		if(Math.abs(origin.y - destination.y) < float_epsilon) {
			// I am an overlapping point, so I cannot be an edge of the hull
			return false;
		}else {
			if(Math.abs(origin.x - other.x) < float_epsilon){
				// When I am on the line I will still be considered an edge of the hull
				return true;
			}else {
				if(origin.y - destination.y > 0) {
					// Y is Inverted, and origin is Below destination, so check if other x is greater than
					if(other.x - origin.x > 0) {
						return true;
					}else {
						// other is to the left of the line
						return false;
					}
				}else {
					// Y is Inverted, and origin is above destination, so check if other is less than
					if(origin.x - other.x > 0) {
						return true;
					}else {
						// other is to the left of the line
						return false;
					}
				}
			}
		}
	}

	// Since I am not a vertical line, then I check what quadrant the vector from origin to destination is in
	// If I am in Quandrant 1 or 4 or Positive X-Axis then I check if other is below in order to be "to the right". So just check if dx > 0
	// If I am in Quandrant 2 or 3 or Negative X-Axis then I check if other is above in order to be "to the right". So just check if dx < 0

	let dx = destination.x - origin.x;

	if(dx > 0) {
		return belowOrOnLine(origin, destination, other);
	}else {
		return aboveOrOnLine(origin, destination, other);
	}
}



function edgesToHullPath(edges) {
    let hull = [];


    if(edges.length > 0) {
        let destination = edges[0]['destination']

        hull.push(edges[0]['origin']);
        edges.splice(0, 1);

        while(edges.length > 0) {
            for(let i = 0; i < edges.length; i++) {
                if(edges[i]['origin'].x == destination.x && edges[i]['origin'].y == destination.y) {
                    destination = edges[i]['destination']

                    hull.push(edges[i].origin);
                    edges.splice(i, 1);

                    break;
                }
            }
        }
    }


    return hull;
}


function naiveHull(vertices) {
    let hull = [];

    let edges = [];


    let all_right = true;


    for(let i = 0; i < vertices.length; i++) {
        for(let j = 0; j < vertices.length; j++) {
            if(j !== i) {
                all_right = true;

                for(let k = 0; k < vertices.length; k++) {
                    if(k !== i && k !== j) {
                        if(!rightOfLine(vertices[i], vertices[j], vertices[k])) {
                            all_right = false;

                            break;
                        }
                    }
                }


                if(all_right) {
                    edges.push({
                        origin: vertices[i],

                        destination: vertices[j]
                    });
                }
            }
        }
    }


    if(edges.length > 2) {
        hull = edgesToHullPath(edges);
    }


    return hull;
}



function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    fillConvex(hullVertices);
    strokePolygon(hullVertices);

    for(let i = 0; i < points.length; i++) {
        vertex(points[i].x, points[i].y);
    }
}



window.onload = function() {
    root = document.getElementById("root");

    canvas = document.createElement("canvas");
    canvas.style.width = "400px";
    canvas.style.height = "400px";
    canvas.style.border = "1px solid black";
    canvas.width = 400;
    canvas.height = 400;

    root.appendChild(canvas);

    ctx = canvas.getContext("2d");


    canvas.addEventListener('click', (e) => {
        clickXY = getMousePos(canvas, e);

        points.push({
            x: clickXY.x,

            y: clickXY.y
        });


        if(points.length > 2) {
            hullVertices = naiveHull(points);
        }
    });



    if(points.length > 2) {
        hullVertices = naiveHull(points);
    }


    setInterval(draw, 27);
}
