import IMAGE_PATH from "../Exercises/Debug/display2.png";
import SHAPE_JSON from "../Exercises/Debug/shapes.json";
import AUDIO_FILE from "../Exercises/Debug/sound.mp3";

import React, { Component } from "react";
import { Button } from "./../Components/Button";
import history from "../Scripts/history";
import "./../Styles/exercise.css";
import { withRouter } from "react-router-dom";
import ImageMapper from "react-img-mapper";
import { v4 as uuidv4 } from "uuid";
import swal from "sweetalert";

// import SheetMusic from "../Components/SheetMusic";

var count;
var isPlaying = false;
var audio = new Audio(AUDIO_FILE);

var IMAGE_MAP = {
  name: "debug-map",
  areas: SHAPE_JSON,
};

const INITIAL_PREFILL_COLOR = "#ffffff00";
const INITIAL_FILL_COLOR = "#e3fc0080";
const INITIAL_STROKE_COLOR = "#ffffff00";

const PITCH_ERROR = "pitchError";
const INTONATION_ERROR = "intonationError";
const RHYTHM_ERROR = "rhythmError";
const NO_ERROR = "noError";
const ERROR_SIGN = "errorSign";

// The 80 at the end of a hex value means 50% transparency
const COLOR_NO_ERROR = "#e3fc0080";
const COLOR_PITCH_ERROR = "#9013fe80";
const COLOR_RHYTHM_ERROR = "#d0021b80";
const COLOR_INTONATION_ERROR = "#ffa50080";
const COLOR_ERROR_SIGN = "#d0021b80";
// The color used for transparency
const COLOR_TRANSPARENT = "#ffffff00";
// The color used for incorrect answers
const COLOR_INCORRECT = "#0eebb980";

var topLeftX = 0;
var topLeftY = 0;
var bottomRightX = 0;
var bottomRightY = 0;

// This indicates whether a temporary shape should be created on clicking the image
// Useful for creating an exercise
var previewEnabled = true;

class Debug extends Component {
  constructor(props) {
    super(props);

    this.state = {
      coordinates: [0, 0],
      selectedArea: { id: "0", isError: false, errorType: "noError" },
      imageWidth: 0,
      windowWidth: window.innerWidth,
      jsonGeneratorSelection: "noError",
      toggle: true,
      allCurrentErrors: SHAPE_JSON,
      theMap: IMAGE_MAP,
      rhythmSide: "topLeft",
    };
    // this.handleClickSheetMusic = this.handleClickSheetMusic.bind(this);

    /*
        This watches for when the window is resized and updates the
        windowWidth so the mapper gets set to the width of the window
        */
    window.addEventListener("resize", () => {
      console.log(
        `window resize detected, updating windowWidth to ${window.innerWidth}`
      );
      this.setState({ windowWidth: window.innerWidth });
    });
  }

  /*
    This sets the initial color of each shape
    */
  setInitialShapeColors(someShapes) {
    for (let shape of someShapes) {
      shape["preFillColor"] = INITIAL_PREFILL_COLOR;
      shape["fillColor"] = INITIAL_FILL_COLOR;
      shape["strokeColor"] = INITIAL_STROKE_COLOR;
    }
  }

  /**
   * Updates the windowWidth state to the current window width
   */
  updateWindowWidth = () => {
    this.setState({ windowWidth: window.innerWidth });
  };

  /**
   * Sets the initial state of the mapper and image width
   */
  async setInitialState() {
    console.log(`setInitialState running`);

    const imgData = await this.getImageWidthHeight();

    this.setInitialShapeColors(SHAPE_JSON);

    this.setState({
      imageWidth: imgData.width,
      theMap: IMAGE_MAP,
    });
  }

  /**
   * Runs on component mount
   */
  async componentDidMount() {
    console.log(`componentDidMount running`);

    await this.setInitialState().then(
      await this.getImageWidthHeight()
        .then(
          (data) =>
          (document.getElementById(
            "image-properties"
          ).innerText = `Image width = ${data.width}\nImage height = ${data.height}`)
        )
        .then(() => {
          this.refreshMapper();
          this.refreshMapper();
        })
    );
  }

  RenderButtonAndSound = () => {
    audio.onended = function () {
      count++;
      isPlaying = false;
      console.log(count);
    };
    return (
      <Button
        onClick={() => {
          if (!isPlaying) {
            audio.play();
            isPlaying = true;
          }
        }}
        type="button"
        buttonStyle="btn--primary--solid"
        buttonSize="btn--medium"
      >
        Play Sound
      </Button>
    );
  };

  /**
   * Given a mouse event, this updates the stored coordinates to where the cursor is
   */
  updateCoordinates(evt) {
    this.setState({
      coordinates: [evt.nativeEvent.layerX, evt.nativeEvent.layerY],
    });
  }

  /**
   * Given a mouse event, this updates the HTML and displays some information like the X and Y coordinates
   */
  updateCoordinateHtml(evt) {
    this.updateCoordinates(evt);
    const coordX = this.state.coordinates[0];
    const coordY = this.state.coordinates[1];

    document.getElementById(
      "x-coordinate"
    ).innerText = `X coordinate is ${coordX}\n`;
    document.getElementById(
      "y-coordinate"
    ).innerText = `Y coordinate is ${coordY}\n`;
    document.getElementById(
      "coordinate-json"
    ).innerText = `Coordinate JSON:\n"coords": [${coordX},${coordY},20]`;
  }

  /**
   * This is triggered when the mouse is moved over the image (not a shape)
   */
  moveOnImage(evt) {
    this.updateCoordinateHtml(evt);
  }

  /**
   * This is triggered when the mouse is moved over a shape
   */
  moveOnArea(area, evt) {
    this.updateCoordinateHtml(evt);
    this.setState({ selectedArea: area });

    const areaId = this.state.selectedArea.id;
    const areasIsError = this.state.selectedArea.isError;
    const areaErrorType = this.state.selectedArea.errorType;

    document.getElementById("shape-id").innerText = ``;
    document.getElementById("shape-id").innerText += `Shape info:\n`;
    document.getElementById("shape-id").innerText += `ID: ${areaId}\n`;
    document.getElementById(
      "shape-id"
    ).innerText += `isError: ${areasIsError}\n`;
    document.getElementById(
      "shape-id"
    ).innerText += `errorType: ${areaErrorType}\n\n`;
    document.getElementById("shape-id").innerText += `JSON:\n${JSON.stringify(
      this.state.selectedArea
    )}`;
  }

  /**
   * This adds a shape to the mapper temporarily so the user
   * can get a preview of where the shape will be placed
   */
  addTempShape(shapeObject) {
    IMAGE_MAP.areas.push(shapeObject);
    this.refreshMapper();
  }

  /**
   * This removes the temporary shape with id "tmp"
   */
  removeTempShape() {
    const removeIndex = IMAGE_MAP.areas.findIndex((item) => item.id === "tmp");

    if (removeIndex !== -1) {
      IMAGE_MAP.areas.splice(removeIndex, 1);
    }

    this.refreshMapper();
  }

  /**
   * This is triggered when a click occurs on the image (not a shape)
   */
  clickedOutside(evt) {
    this.updateCoordinates(evt);
    const newId = uuidv4();
    const coordX = this.state.coordinates[0];
    const coordY = this.state.coordinates[1];

    let isError = false;
    if (this.state.jsonGeneratorSelection !== "noError") {
      isError = true;
    }
    let errorType = this.state.jsonGeneratorSelection;

    let newShape = "";
    let newCoords = "";

    if (this.state.jsonGeneratorSelection == "rhythmError") {
      console.log(`rhythm error selected`);

      if (this.state.rhythmSide == "topLeft") {
        console.log(`picked the top left side`);
        topLeftX = coordX;
        topLeftY = coordY;
        bottomRightX = topLeftX + 5;
        bottomRightY = topLeftY + 5;

        this.setState({ rhythmSide: "bottomRight" });
      }

      if (this.state.rhythmSide == "bottomRight") {
        console.log(`picked the bottom right side`);
        bottomRightX = coordX;
        bottomRightY = coordY;

        this.setState({ rhythmSide: "topLeft" });
      }

      console.log(`rhythmSide=${this.state.rhythmSide}`);

      newShape = `rect`;
      newCoords = [topLeftX, topLeftY, bottomRightX, bottomRightY];
    } else {
      console.log(`non rhythm error detected`);

      newShape = `circle`;
      newCoords = [coordX, coordY, 20];
    }

    let generated = {
      id: newId,
      isError: isError,
      errorType: errorType,
      shape: newShape,
      coords: newCoords,
    };

    let formatted = JSON.stringify(generated, null, 4);

    document.getElementById("generated-json").innerText = formatted;

    generated.id = "tmp";
    generated.preFillColor = "#F012BE";

    if (previewEnabled) {
      this.removeTempShape();
      this.addTempShape(generated);
    }
  }
  /**
   * Takes in the shape id of an error sign and turns its color to red
   */
  turnErrorSignON(errorSignID) {
    for (const sign of IMAGE_MAP.areas) {
      if (sign.id == errorSignID) {
        sign.fillColor = COLOR_ERROR_SIGN;
        sign.preFillColor = COLOR_ERROR_SIGN;
      }
    }
  }
  /**
   * Determines which error sign is associated with the given shape then
   * calls the turnErrorSignON function to turn the correct error sign red
   */
  whichErrorSign(shape) {
    let closest = 10000;
    let errorSignID;
    for (const sign of IMAGE_MAP.areas) {
      if (sign.errorType == ERROR_SIGN) {
        let diff = Math.abs(shape.coords[0] - sign.coords[0]);
        if (diff < closest) {
          closest = diff;
          errorSignID = sign.id;
        }
      }
    }
    this.turnErrorSignON(errorSignID);
  }

  /**
   * This calculates the number of correct and incorrect selections
   * and displays it on the webpage
   */
  generateShapeInfo() {
    let pitchErrorsCorrect = 0;
    let pitchErrorsMissed = 0;
    let rhythmErrorsCorrect = 0;
    let rhythmErrorsMissed = 0;
    let intonationErrorsCorrect = 0;
    let intonationErrorsMissed = 0;
    let noErrorsCorrect = 0;
    let noErrorsMissed = 0;

    for (const shape of IMAGE_MAP.areas) {
      // Check if the shape's fill color is correct
      if (shape.errorType == PITCH_ERROR) {
        if (shape.fillColor == COLOR_PITCH_ERROR) {
          pitchErrorsCorrect += 1;
        } else {
          pitchErrorsMissed += 1;
        }
      } else if (shape.errorType == INTONATION_ERROR) {
        if (shape.fillColor == COLOR_INTONATION_ERROR) {
          intonationErrorsCorrect += 1;
        } else {
          intonationErrorsMissed += 1;
        }
      } else if (shape.errorType == RHYTHM_ERROR) {
        if (shape.fillColor == COLOR_RHYTHM_ERROR) {
          rhythmErrorsCorrect += 1;
        } else {
          rhythmErrorsMissed += 1;
        }
      } else if (shape.errorType == NO_ERROR) {
        if (shape.fillColor == COLOR_NO_ERROR) {
          noErrorsCorrect += 1;
        } else {
          noErrorsMissed += 1;
        }
      }

      const totalCorrect =
        pitchErrorsCorrect +
        rhythmErrorsCorrect +
        intonationErrorsCorrect +
        noErrorsCorrect;
      const totalMissed =
        pitchErrorsMissed +
        rhythmErrorsMissed +
        intonationErrorsMissed +
        noErrorsMissed;

      const reportText = `Shapes Debug Info
                There are ${IMAGE_MAP.areas.length} shapes
                pitchErrorsCorrect=${pitchErrorsCorrect}, pitchErrorsMissed=${pitchErrorsMissed}
                intonationErrorsCorrect=${intonationErrorsCorrect}, intonationErrorsMissed=${intonationErrorsMissed}
                rhythmErrorsCorrect=${rhythmErrorsCorrect}, rhythmErrorsMissed=${rhythmErrorsMissed}
                noErrorsCorrect=${noErrorsCorrect}, noErrorsMissed=${noErrorsMissed}
                totalCorrect=${totalCorrect}/${IMAGE_MAP.areas.length}\n totalMissed=${totalMissed}/${IMAGE_MAP.areas.length}
                `;

      document.getElementById("shapes-info").innerText = reportText;
    }
  }

  /**
   * This is triggered when a shape is clicked
   */
  clicked(area) {
    for (const shape of IMAGE_MAP.areas) {
      if (shape.errorType == "errorSign") {
        //do nothing
      } else if (shape.errorType != "rhythmError") {
        if (shape.id === area.id) {
          if (area.fillColor === COLOR_PITCH_ERROR) {
            shape.fillColor = COLOR_INTONATION_ERROR;
            shape.preFillColor = COLOR_INTONATION_ERROR;
          } else if (area.fillColor === COLOR_INTONATION_ERROR) {
            shape.fillColor = COLOR_NO_ERROR;
            shape.preFillColor = COLOR_TRANSPARENT;
          } else if (area.fillColor === COLOR_NO_ERROR) {
            shape.fillColor = COLOR_PITCH_ERROR;
            shape.preFillColor = COLOR_PITCH_ERROR;
          } else {
            shape.fillColor = COLOR_NO_ERROR;
            shape.preFillColor = COLOR_TRANSPARENT;
          }
        }
      } else {
        if (shape.id === area.id) {
          if (area.fillColor === COLOR_NO_ERROR) {
            shape.fillColor = COLOR_RHYTHM_ERROR;
            shape.preFillColor = COLOR_RHYTHM_ERROR;
          } else if (area.fillColor === COLOR_RHYTHM_ERROR) {
            shape.fillColor = COLOR_NO_ERROR;
            shape.preFillColor = COLOR_TRANSPARENT;
          } else {
            shape.fillColor = COLOR_NO_ERROR;
            shape.preFillColor = COLOR_TRANSPARENT;
          }
        }
      }
    }

    this.refreshMapper();
    this.generateShapeInfo();
  }

  /**
   * This gets the image's width and height and returns it
   */
  async getImageWidthHeight() {
    var img = new Image();

    img.onload = async function () {
      const data = { width: img.width, height: img.height };
      return data;
    };

    img.src = IMAGE_PATH;
    return img.onload();
  }

  // handleClickSheetMusic(){
  //     console.log("component has been clicked at coordinates: (", this.state.coords.x, ",", this.state.coords.y,")");
  //     let newAreas = this.state.imageMapAreas;
  //     let newError = {
  //         // "id": "azsexdcfvgbhawsexdrcvfgbhqwsedrf",
  //         "isError": true,
  //         "errorType": "pitchError",
  //         "shape": "circle",
  //         "preFillColor": "#e3fc0080",
  //         "fillColor": "#e3fc0080",
  //         "strokeColor": "black",
  //         "coords": [
  //             this.state.coords.x,
  //             this.state.coords.y,
  //             20
  //         ]
  //     };
  //     newAreas.push(newError);
  //     this.setState({ imageMapAreas: newAreas });
  // }

  /**
   * This is a temporary fix to make React refresh the mapper
   */
  // a potential fix to this would be to use componentDidUpdate() for changing things immediately
  refreshMapper() {
    if (this.state.toggle === true) {
      this.setState({
        imageWidth: window.imageWidth + 1,
        toggle: false,
      });
    } else {
      this.setState({
        imageWidth: window.imageWidth - 1,
        toggle: true,
      });
    }
  }

  /*
    This returns a summary of correct/incorrect selections for the user
    */
  generateResults() {
    let reportText = "";

    let pitchErrorsCorrect = 0;
    let pitchErrorsMissed = 0;
    let rhythmErrorsCorrect = 0;
    let rhythmErrorsMissed = 0;
    let intonationErrorsCorrect = 0;
    let intonationErrorsMissed = 0;
    let noErrorsCorrect = 0;
    let noErrorsMissed = 0;

    for (const shape of this.state.allCurrentErrors) {
      // Check if the shape's fill color is correct
      if (shape.errorType === PITCH_ERROR) {
        if (shape.fillColor === COLOR_PITCH_ERROR) {
          pitchErrorsCorrect += 1;
        } else {
          pitchErrorsMissed += 1;
          this.whichErrorSign(shape);
          if (shape.fillColor != COLOR_NO_ERROR) {
            shape.fillColor = COLOR_INCORRECT;
            shape.preFillColor = COLOR_INCORRECT;
          }
        }
      } else if (shape.errorType === INTONATION_ERROR) {
        if (shape.fillColor === COLOR_INTONATION_ERROR) {
          intonationErrorsCorrect += 1;
        } else {
          intonationErrorsMissed += 1;
          this.whichErrorSign(shape);
          if (shape.fillColor != COLOR_NO_ERROR) {
            shape.fillColor = COLOR_INCORRECT;
            shape.preFillColor = COLOR_INCORRECT;
          }
        }
      } else if (shape.errorType === RHYTHM_ERROR) {
        if (shape.fillColor === COLOR_RHYTHM_ERROR) {
          rhythmErrorsCorrect += 1;
        } else {
          rhythmErrorsMissed += 1;
          this.whichErrorSign(shape);
          if (shape.fillColor != COLOR_NO_ERROR) {
            shape.fillColor = COLOR_INCORRECT;
            shape.preFillColor = COLOR_INCORRECT;
          }
        }
      } else if (shape.errorType === NO_ERROR) {
        if (shape.fillColor === COLOR_NO_ERROR) {
          noErrorsCorrect += 1;
          shape.preFillColor = COLOR_TRANSPARENT;
          shape.strokeColor = COLOR_TRANSPARENT;
        } else {
          noErrorsMissed += 1;
          this.whichErrorSign(shape);
          shape.fillColor = COLOR_INCORRECT;
          shape.preFillColor = COLOR_INCORRECT;
        }
      }

      const totalCorrect =
        pitchErrorsCorrect +
        rhythmErrorsCorrect +
        intonationErrorsCorrect +
        noErrorsCorrect;
      const totalMissed =
        pitchErrorsMissed +
        rhythmErrorsMissed +
        intonationErrorsMissed +
        noErrorsMissed;
      const pitchErrors = pitchErrorsCorrect + pitchErrorsMissed;
      const rhythmErrors = rhythmErrorsCorrect + rhythmErrorsMissed;
      const intonationErrors = intonationErrorsCorrect + intonationErrorsMissed;

      reportText = `Here are the results of your submission:\n\nIncorrect guesses are represented by the cyan circles.\n\n`;

      reportText += `There are ${pitchErrors + rhythmErrors + intonationErrors
        } errors in this exercise.\n`;
      reportText += `You found ${pitchErrorsCorrect + rhythmErrorsCorrect + intonationErrorsCorrect
        } errors and missed ${pitchErrorsMissed + rhythmErrorsMissed + intonationErrorsMissed
        } errors.\n\n`;

      if (totalMissed > 0) {
        reportText = reportText.concat(`You missed: \n`);
        if (pitchErrorsMissed > 0) {
          reportText = reportText.concat(`${pitchErrorsMissed} pitch error`);
          if (pitchErrorsMissed > 1) {
            reportText = reportText.concat(`s`);
          }
          reportText = reportText.concat(`\n`);
        }
        if (rhythmErrorsMissed > 0) {
          reportText = reportText.concat(`${rhythmErrorsMissed} rhythm error`);
          if (rhythmErrorsMissed > 1) {
            reportText = reportText.concat(`s`);
          }
          reportText = reportText.concat(`\n`);
        }
        if (intonationErrorsMissed > 0) {
          reportText = reportText.concat(
            `${intonationErrorsMissed} intonation error`
          );
          if (intonationErrorsMissed > 1) {
            reportText = reportText.concat(`s`);
          }
          reportText = reportText.concat(`\n`);
        }
      } else {
        reportText = reportText.concat(
          `You correctly identified all errors!\n`
        );
      }

      reportText += "\n";
      reportText += `You incorrectly labeled ${noErrorsMissed} shapes as being errors when they were not errors.\n\n`;
    }

    return reportText;
  }

  render() {
    if (!count) {
      count = 0;
    }

    return (
      <div id="exercise-debug" className="exercise">
        <h2>Debug</h2>
        <div className="Instructions">
          <h2>
            This page is used to create exercises.
            <br></br>
            See ExerciseTemplate.js to view or modify the instructions and text that is shown on every exercise.
            <br></br>
            <br></br>
            Look in the Google Drive folder for exercise creation instructions.
            <br></br>
            <br></br>
          </h2>
        </div>

        {this.RenderButtonAndSound()}

        <br></br>
        <br></br>

        <Button
          onClick={() => {
            for (const shape of this.state.allCurrentErrors) {
              // If the shape is transparent, make it visible
              if (shape.preFillColor === COLOR_TRANSPARENT) {
                shape.preFillColor = COLOR_NO_ERROR;
              }
              // Otherwise make it transparent
              else {
                shape.preFillColor = COLOR_TRANSPARENT;
              }
            }

            this.refreshMapper();
          }}
          type="button"
          buttonStyle="btn--primary--solid-go-back"
          buttonSize="btn--medium"
        >
          Toggle Transparency
        </Button>

        <Button
          onClick={() => this.refreshMapper()}
          type="button"
          buttonStyle="btn--primary--solid-go-back"
          buttonSize="btn--medium"
        >
          Refresh Mapper
        </Button>

        <Button
          onClick={() => {
            for (const shape of this.state.allCurrentErrors) {
              switch (shape.errorType) {
                case PITCH_ERROR:
                  shape.fillColor = COLOR_PITCH_ERROR;
                  shape.preFillColor = COLOR_PITCH_ERROR;
                  break;
                case INTONATION_ERROR:
                  shape.fillColor = COLOR_INTONATION_ERROR;
                  shape.preFillColor = COLOR_INTONATION_ERROR;
                  break;
                case RHYTHM_ERROR:
                  shape.fillColor = COLOR_RHYTHM_ERROR;
                  shape.preFillColor = COLOR_RHYTHM_ERROR;
                  break;
                case NO_ERROR:
                  shape.fillColor = COLOR_NO_ERROR;
                  shape.preFillColor = COLOR_NO_ERROR;
                  break;
                default:
                  console.log(`Unknown error type`);
              }
            }

            this.refreshMapper();
          }}
          type="button"
          buttonStyle="btn--primary--solid-go-back"
          buttonSize="btn--medium"
        >
          Select All Correct Answers
        </Button>

        <br></br>
        <br></br>

        <Button
          onClick={() => {
            previewEnabled = !previewEnabled;
          }}
          type="button"
          buttonStyle="btn--primary--solid-go-back"
          buttonSize="btn--medium"
        >
          Toggle Preview
        </Button>

        <Button
          onClick={() => {
            this.removeTempShape();
          }}
          type="button"
          buttonStyle="btn--primary--solid-go-back"
          buttonSize="btn--medium"
        >
          Remove Preview Shape
        </Button>

        <br></br>
        <br></br>

        <div>
          <p>To see the color coding key, look at the top of Debug.js or ExerciseTemplate.js or open any exercise.</p>
        </div>

        <div
          id="mapper-container"
          style={{
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <ImageMapper
            id="mapper-debug"
            src={IMAGE_PATH}
            map={this.state.theMap}
            onImageMouseMove={(evt) => this.moveOnImage(evt)}
            onMouseMove={(area, _, evt) => this.moveOnArea(area, evt)}
            onImageClick={(evt) => this.clickedOutside(evt)}
            onClick={(area) => this.clicked(area)}
            stayMultiHighlighted={true}
            width={this.state.imageWidth}
            imgWidth={this.state.imageWidth}
          />
        </div>

        <br></br>

        <div id="debug-information">Debug Information</div>

        <br></br>

        <div id="image-properties">...</div>

        <br></br>

        <div id="x-coordinate">X coordinate is unknown</div>

        <div id="y-coordinate">Y coordinate is unknown</div>

        <br></br>

        <div id="coordinate-json">Coordinate JSON is unknown</div>

        <br></br>

        <div id="shape-id">Shape info: unknown</div>

        <br></br>
        <br></br>

        {/* <SheetMusic onInsideClick={this.handleClickSheetMusic}> */}
        {/* <SheetMusic> */}
        {/* </SheetMusic> */}

        <br></br>
        <br></br>

        <Button
          onClick={() => {
            history.goBack();
          }}
          type="button"
          buttonStyle="btn--primary--solid-go-back"
          buttonSize="btn--medium"
        >
          Back
        </Button>

        <Button
          id="reset"
          onClick={() => {
            if (window.confirm("Are you sure you want to reset?")) {
              window.location.reload(false);
            }
          }}
          type="button"
          buttonStyle="btn--primary--solid"
          buttonSize="btn--medium"
        >
          Reset
        </Button>

        <Button
          id="submit"
          onClick={() => {
            const results = this.generateResults();
            //swal(results);
            this.refreshMapper();
          }}
          type="button"
          buttonStyle="btn--primary--solid"
          buttonSize="btn--medium"
        >
          Submit
        </Button>

        <br></br>
        <br></br>
        <br></br>

        <p>
          Use the below buttons and information to create an exercise
          <br></br>
          If the preview shape isn't enabled. you will likely want to click the
          "Toggle Preview" button at the top of this page
          <br></br>
          When adding a rhythm error, click on the area where you want the TOP
          LEFT of the rectangle to be.
          <br></br>
          Then, click on the area where you want the BOTTOM RIGHT of the
          rectangle to be.
        </p>

        <br></br>

        <div className="radio-buttons-error-type">
          <input
            type="radio"
            name="clickType"
            value=""
            onClick={() => this.setState({ jsonGeneratorSelection: NO_ERROR })}
          />
          No error <br></br>
          <input
            type="radio"
            name="clickType"
            value=""
            onClick={() =>
              this.setState({ jsonGeneratorSelection: PITCH_ERROR })
            }
          />
          Pitch error <br></br>
          <input
            type="radio"
            name="clickType"
            value=""
            onClick={() =>
              this.setState({ jsonGeneratorSelection: INTONATION_ERROR })
            }
          />
          Intonation error <br></br>
          <input
            type="radio"
            name="clickType"
            value=""
            onClick={() =>
              this.setState({ jsonGeneratorSelection: RHYTHM_ERROR })
            }
          />
          Rhythm error
        </div>

        <br></br>

        <div
          id="generated-json"
          style={{ marginRight: 20 + "px", marginLeft: 20 + "px" }}
        >
          Copy the generated JSON below
        </div>

        <br></br>
        <br></br>

        <div
          id="shapes-info"
          style={{
            marginTop: 30 + "px",
            marginRight: 20 + "px",
            marginLeft: 20 + "px",
          }}
        >
          Shapes Info
        </div>
      </div>
    );
  }
}

export default withRouter(Debug);