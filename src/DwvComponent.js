import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, useTheme } from '@mui/styles';
import Typography from '@mui/material/Typography';

import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// https://mui.com/material-ui/material-icons/
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import MenuIcon from '@mui/icons-material/Menu';
import ContrastIcon from '@mui/icons-material/Contrast';
import SearchIcon from '@mui/icons-material/Search';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import StraightenIcon from '@mui/icons-material/Straighten';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';

import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Slide from '@mui/material/Slide';
import Toolbar from '@mui/material/Toolbar';

import TagsTable from './TagsTable';

import './DwvComponent.css';
import {
  App,
  getDwvVersion,
  decoderScripts
} from 'dwv';
import preval from 'babel-plugin-preval/macro'
import { Button } from '@mui/material';

// Image decoders (for web workers)
decoderScripts.jpeg2000 = `${process.env.PUBLIC_URL}/assets/dwv/decoders/pdfjs/decode-jpeg2000.js`;
decoderScripts["jpeg-lossless"] = `${process.env.PUBLIC_URL}/assets/dwv/decoders/rii-mango/decode-jpegloss.js`;
decoderScripts["jpeg-baseline"] = `${process.env.PUBLIC_URL}/assets/dwv/decoders/pdfjs/decode-jpegbaseline.js`;
decoderScripts.rle = `${process.env.PUBLIC_URL}/assets/dwv/decoders/dwv/decode-rle.js`;

const styles = theme => ({
  appBar: {
    position: 'relative',
  },
  title: {
    flex: '0 0 auto',
  },
  iconSmall: {
    fontSize: 20,
  },
  dicomTextContainer: {
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '8px',
    margin: '8px 0',
    minHeight: '100px', // Adjust height as needed
    overflowY: 'auto',
  },
});

export const TransitionUp = React.forwardRef((props, ref) => (
  <Slide direction="up" {...props} ref={ref} />
))

function importAll(r) {
  let files = [];
  r.keys().forEach((item, index) => { files.push(r(item)); });
  return files;
}

class DwvComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      versions: {
        dwv: getDwvVersion(),
        react: React.version
      },
      tools: {
        Scroll: {},
        ZoomAndPan: {},
        WindowLevel: {},
        Draw: {
          options: ['Ruler']
        }
      },
      selectedTool: 'Select Tool',
      loadProgress: 0,
      dataLoaded: false,
      dwvApp: null,
      metaData: {},
      orientation: undefined,
      windowWidth: window.innerWidth,
      showDicomTags: false,
      dropboxDivId: 'dropBox',
      dropboxClassName: 'dropBox',
      borderClassName: 'dropBoxBorder',
      hoverClassName: 'hover',
      dicomText: '', // Text to display in the dicomTextContainer
      currentUserId:'',
      enableDicomText: false,
      dicomObj: {
        1: {
          folderPath: 'sample/brain',
        },
        2: {
          folderPath: 'sample/skull_bone',
        },
        3: {
          folderPath: 'series-00000',
        },
        4: {
          folderPath: 'test1',
        },
        5: {
          folderPath: 'test2',
        }
      }
    };

  }

  handleSaveClick = () => {
    const endpoint = `http://dev.radpretation.ai/api/pub/dicom-description/${this.state.currentUserId}`;
    // Make a POST request
    fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: this.state.dicomText,
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('Save successful:', data);
      // You can perform additional actions after a successful save
      window.alert('Report is updated successfully!');
    })
    .catch(error => {
      console.error('Save error:', error);
      // Handle error scenarios
    });
  };

  getDicomText = () => {
    const endpoint = `http://dev.radpretation.ai/api/pub/get-dicom-description?id=${this.state.currentUserId}`;
    // Make a POST request
    fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      this.setState({ dicomText: data.data.dicomDesc });
    })
    .catch(error => {
      console.error('GET error:', error);
      // Handle error scenarios
    });
  };
  
  handleTextChange = event => {
    this.setState({ ...this.state, dicomText: event.target.value });
  };

  render() {
    const { classes } = this.props;
    const { versions, tools, loadProgress, dataLoaded, metaData } = this.state;
    const { windowWidth } = this.state;

    // Calculate left value based on window width
    let leftValue = '50%';
    if (windowWidth >= 1200 && windowWidth < 1300) {
      leftValue = '780px';
    } else if (windowWidth < 1200) {
      // Calculate left value based on window width if it's below 1200
      // Adjust the calculation as per your requirements
      leftValue = `${780 - (1200 - windowWidth)}px`;
    }
    else {
      leftValue = `${680 + (windowWidth - 1200)}px`;
    }

    // Dynamically set style for dicomTextContainer
    const dicomTextContainerStyle = {

      left: leftValue // Update left value dynamically
    };
    const handleToolChange = (event, newTool) => {
      if (newTool) {
        this.onChangeTool(newTool);
      }
    };
    const toolsButtons = Object.keys(tools).map((tool) => {
      return (
        <ToggleButton value={tool} key={tool} title={tool}
          disabled={!dataLoaded || !this.canRunTool(tool)}>
          {this.getToolIcon(tool)}
        </ToggleButton>
      );
    });

    return (
      <div id="dwv">
        <LinearProgress variant="determinate" value={loadProgress} />
        <Stack  direction="row" spacing={1} padding={1} style={this.state.enableDicomText ? {marginLeft:325} :{justifyContent: 'center'} }>
          <ToggleButtonGroup size="small"
            color="primary"
            value={this.state.selectedTool}
            exclusive
            onChange={handleToolChange}
          >
            {toolsButtons}
          </ToggleButtonGroup>

          <ToggleButton size="small"
            value="reset"
            title="Reset"
            disabled={!dataLoaded}
            onChange={this.onReset}
          ><RefreshIcon /></ToggleButton>

          <ToggleButton size="small"
            value="toggleOrientation"
            title="Toggle Orientation"
            disabled={!dataLoaded}
            onClick={this.toggleOrientation}
          ><CameraswitchIcon /></ToggleButton>

          <ToggleButton size="small"
            value="tags"
            title="Tags"
            disabled={!dataLoaded}
            onClick={this.handleTagsDialogOpen}
          ><LibraryBooksIcon /></ToggleButton>

          <Dialog
            open={this.state.showDicomTags}
            onClose={this.handleTagsDialogClose}
            TransitionComponent={TransitionUp}
          >
            <AppBar className={classes.appBar} position="sticky">
              <Toolbar>
                <IconButton color="inherit" onClick={this.handleTagsDialogClose} aria-label="Close">
                  <CloseIcon />
                </IconButton>
                <Typography variant="h6" color="inherit" className={classes.flex}>
                  DICOM Tags
                </Typography>
              </Toolbar>
            </AppBar>
            <TagsTable data={metaData} />
          </Dialog>
        </Stack>
        <div className="lineBox"></div>
        <div style={{
          display:'flex',
          flexDirection: 'row',
          height:'100%'
          // justifyContent: 'space-between',
          // alignItems: 'center',
          // width: '100%'
        }}>
        <div id="layerGroup0" className="layerGroup" style={{flex:1}} sstyle={{ width: this.state.enableDicomText ? '50%' : '100%' }}>
          <div id="dropBox"></div>
        </div>
        {
          this.state.enableDicomText && 
          <div className='dicomTextContainer' sstyle={dicomTextContainerStyle}>
            <textarea
              value={this.state.dicomText}
              onChange={(e) => {
                this.setState({ dicomText: e.target.value });
              }}
              rows={27} // Specify the number of rows
              cols={40} // Specify the number of columns
              style={{
                width: '-webkit-fill-available',
                fontSize: '16px', // Increase font size to 16px
                fontFamily: 'sans-serif', // Specify font family
                // fontWeight: 'bold', // Make the text bold
                padding: '5px',
                margin: '10px 15px',
                marginTop : '0px',
                height:'90%',
              }}
            />
            <Button variant="contained"  onClick={this.handleSaveClick} > Save </Button>
            {/* <button onClick={this.handleSaveClick}>Save</button> */}
          </div>
        }
        
        </div>
        

        {/* dicom text container */}
        {this.state.enableDicomText && false &&
          <div className='dicomTextContainer' sstyle={dicomTextContainerStyle}>
            <textarea
              value={this.state.dicomText}
              onChange={(e) => {
                this.setState({ dicomText: e.target.value });
              }}
              rows={3} // Specify the number of rows
              // cols={40} // Specify the number of columns
              style={{
                width: '-webkit-fill-available',
                fontSize: '16px', // Increase font size to 16px
                fontFamily: 'sans-serif', // Specify font family
                // fontWeight: 'bold', // Make the text bold
                padding: '5px',
                margin: '10px 15px'
              }}
            />
            <Button variant="contained"  onClick={this.handleSaveClick} > Save </Button>
            {/* <button onClick={this.handleSaveClick}>Save</button> */}
          </div>}

        {/* <div><p className="legend">
          <Typography variant="caption">Powered by <Link
            href="https://github.com/ivmartel/dwv"
            title="dwv on github"
            color="inherit">dwv
          </Link> {versions.dwv} and <Link
            href="https://github.com/facebook/react"
            title="react on github"
            color="inherit">React
            </Link> {versions.react}
          </Typography>
        </p></div> */}

      </div>
    );
  }

  handleResize = () => {
    this.setState({ windowWidth: window.innerWidth });
  }
  componentDidMount() {
    // Import images

    // Create app
    const app = new App();
    const queryParams = new URLSearchParams(window.location.search);
    const id = queryParams.get('id');

    // Initialise app
    app.init({
      "dataViewConfigs": { '*': [{ divId: 'layerGroup0' }] },
      "tools": this.state.tools
    });

    // Load events
    let nLoadItem = null;
    let nReceivedLoadError = null;
    let nReceivedLoadAbort = null;
    let isFirstRender = null;
    app.addEventListener('loadstart', (/*event*/) => {
      // Reset flags
      nLoadItem = 0;
      nReceivedLoadError = 0;
      nReceivedLoadAbort = 0;
      isFirstRender = true;
      // Hide drop box
      this.showDropbox(app, false);
    });
    app.addEventListener("loadprogress", (event) => {
      this.setState({ loadProgress: event.loaded });
    });
    app.addEventListener('renderend', (/*event*/) => {
      if (isFirstRender) {
        isFirstRender = false;
        // Available tools
        let selectedTool = 'ZoomAndPan';
        if (app.canScroll()) {
          selectedTool = 'Scroll';
        }
        this.onChangeTool(selectedTool);
      }
    });
    app.addEventListener("load", (/*event*/) => {
      // Set DICOM tags
      this.setState({ metaData: app.getMetaData(0) });
      // Set data loaded flag
      this.setState({ dataLoaded: true });
    });
    app.addEventListener('loadend', (/*event*/) => {
      if (nReceivedLoadError) {
        this.setState({ loadProgress: 0 });
        alert('Received errors during load. Check log for details.');
        // Show drop box if nothing has been loaded
        if (!nLoadItem) {
          this.showDropbox(app, true);
        }
      }
      if (nReceivedLoadAbort) {
        this.setState({ loadProgress: 0 });
        alert('Load was aborted.');
        this.showDropbox(app, true);
      }
    });
    window.addEventListener('resize', this.handleResize);
    app.addEventListener('loaditem', (/*event*/) => {
      ++nLoadItem;
    });
    app.addEventListener('loaderror', (event) => {
      console.error(event.error);
      ++nReceivedLoadError;
    });
    app.addEventListener('loadabort', (/*event*/) => {
      ++nReceivedLoadAbort;
    });

    // Handle key events
    app.addEventListener('keydown', (event) => {
      app.defaultOnKeydown(event);
    });
    // Handle window resize
    window.addEventListener('resize', app.onResize);

    // Store app
    this.setState({ dwvApp: app });

    // Setup drop box
    this.setupDropbox(app);

    // Possible load from location
    //app.loadFromUri(window.location.href);

    // read file according to query param
    if (id) {
      this.state.currentUserId = id;
      this.state.enableDicomText = true;
      let path = `./assests`;
      let dicImagesT = [];
      switch(Number(id)){
        case 1: 
        dicImagesT = importAll(require.context(`./assests/series-00000`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/series-00000`;
          break;
        case 2 : 
         dicImagesT = importAll(require.context(`./assests/sample/brain`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/sample/brain`;
          break;
        case 3: 
          dicImagesT = importAll(require.context(`./assests/sample/skull_bone`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/sample/skull_bone`;
          break;
        case 4: 
        dicImagesT = importAll(require.context(`./assests/103390636/20210217/brain`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/103390636/20210217/brain`;
          break;
        case 5: 
        dicImagesT = importAll(require.context(`./assests/101453181/20210301/brain`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/101453181/20210301/brain`;
          break;
        case 6: 
        dicImagesT = importAll(require.context(`./assests/101453181/20210301/skull_bone`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/101453181/20210301/skull_bone`;
          break;
        case 7: 
        dicImagesT = importAll(require.context(`./assests/101453181/20210303/brain`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/101453181/20210303/brain`;
          break;
        case 8: 
        dicImagesT = importAll(require.context(`./assests/101453181/20210303/skull_bone`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/101453181/20210303/skull_bone`;
          break;
        case 9: 
        dicImagesT = importAll(require.context(`./assests/103395364/20210122/brain`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/103395364/20210122/brain`;
          break;
        case 10: 
        dicImagesT = importAll(require.context(`./assests/103395364/20210122/skull_bone`, false, /\.(dcm|DCM|jpe?g|svg)$/));
        path = `${path}/103395364/20210122/skull_bone`;
          break;
        default:
          dicImagesT = importAll(require.context(`./assests/test1`, false, /\.(dcm|DCM|jpe?g|svg)$/));
          path = `${path}/test1`;
      }
      this.getDicomText()
      // load dicom file
      try {
        app.loadURLs(dicImagesT);
      } catch (error) {
        console.log(error);
      }

    }

  }

  fetchDICOMData = (path) => {
    return fetch(path)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        // Convert ArrayBuffer to Uint8Array
        const byteArray = new Uint8Array(arrayBuffer);
        // Return DICOM data as Blob
        return new Blob([byteArray], { type: 'application/dicom' });
      });
  }

  /**
   * Get the icon of a tool.
   *
   * @param {string} tool The tool name.
   * @returns {Icon} The associated icon.
   */
  getToolIcon = (tool) => {
    let res;
    if (tool === 'Scroll') {
      res = (<MenuIcon />);
    } else if (tool === 'ZoomAndPan') {
      res = (<SearchIcon />);
    } else if (tool === 'WindowLevel') {
      res = (<ContrastIcon />);
    } else if (tool === 'Draw') {
      res = (<StraightenIcon />);
    }
    return res;
  }

  /**
   * Handle a change tool event.
   * @param {string} tool The new tool name.
   */
  onChangeTool = (tool) => {
    if (this.state.dwvApp) {
      this.setState({ selectedTool: tool });
      this.state.dwvApp.setTool(tool);
      if (tool === 'Draw') {
        this.onChangeShape(this.state.tools.Draw.options[0]);
      }
    }
  }

  /**
   * Check if a tool can be run.
   *
   * @param {string} tool The tool name.
   * @returns {boolean} True if the tool can be run.
   */
  canRunTool = (tool) => {
    let res;
    if (tool === 'Scroll') {
      res = this.state.dwvApp.canScroll();
    } else if (tool === 'WindowLevel') {
      res = this.state.dwvApp.canWindowLevel();
    } else {
      res = true;
    }
    return res;
  }

  /**
   * Toogle the viewer orientation.
   */
  toggleOrientation = () => {
    if (typeof this.state.orientation !== 'undefined') {
      if (this.state.orientation === 'axial') {
        this.state.orientation = 'coronal';
      } else if (this.state.orientation === 'coronal') {
        this.state.orientation = 'sagittal';
      } else if (this.state.orientation === 'sagittal') {
        this.state.orientation = 'axial';
      }
    } else {
      // default is most probably axial
      this.state.orientation = 'coronal';
    }
    // update data view config
    const config = {
      '*': [
        {
          divId: 'layerGroup0',
          orientation: this.state.orientation
        }
      ]
    };
    this.state.dwvApp.setDataViewConfigs(config);
    // render data
    for (let i = 0; i < this.state.dwvApp.getNumberOfLoadedData(); ++i) {
      this.state.dwvApp.render(i);
    }
  }

  /**
   * Handle a change draw shape event.
   * @param {string} shape The new shape name.
   */
  onChangeShape = (shape) => {
    if (this.state.dwvApp) {
      this.state.dwvApp.setToolFeatures({ shapeName: shape });
    }
  }

  /**
   * Handle a reset event.
   */
  onReset = () => {
    if (this.state.dwvApp) {
      this.state.dwvApp.resetDisplay();
    }
  }

  /**
   * Open the DICOM tags dialog.
   */
  handleTagsDialogOpen = () => {
    this.setState({ showDicomTags: true });
  }

  /**
   * Close the DICOM tags dialog.
   */
  handleTagsDialogClose = () => {
    this.setState({ showDicomTags: false });
  };

  // drag and drop [begin] -----------------------------------------------------

  /**
   * Setup the data load drop box: add event listeners and set initial size.
   */
  setupDropbox = (app) => {
    this.showDropbox(app, true);
  }

  /**
   * Default drag event handling.
   * @param {DragEvent} event The event to handle.
   */
  defaultHandleDragEvent = (event) => {
    // prevent default handling
    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * Handle a drag over.
   * @param {DragEvent} event The event to handle.
   */
  onBoxDragOver = (event) => {
    this.defaultHandleDragEvent(event);
    // update box border
    const box = document.getElementById(this.state.dropboxDivId);
    if (box && box.className.indexOf(this.state.hoverClassName) === -1) {
      box.className += ' ' + this.state.hoverClassName;
    }
  }

  /**
   * Handle a drag leave.
   * @param {DragEvent} event The event to handle.
   */
  onBoxDragLeave = (event) => {
    this.defaultHandleDragEvent(event);
    // update box class
    const box = document.getElementById(this.state.dropboxDivId);
    if (box && box.className.indexOf(this.state.hoverClassName) !== -1) {
      box.className = box.className.replace(' ' + this.state.hoverClassName, '');
    }
  }

  /**
   * Handle a drop event.
   * @param {DragEvent} event The event to handle.
   */
  onDrop = (event) => {
    this.defaultHandleDragEvent(event);
    // load files
    this.state.dwvApp.loadFiles(event.dataTransfer.files);
  }

  /**
   * Handle a an input[type:file] change event.
   * @param event The event to handle.
   */
  onInputFile = (event) => {
    if (event.target && event.target.files) {
      console.log(event.target.files, 'yashu');
      this.state.dwvApp.loadFiles(event.target.files);
    }
  }

  /**
   * Show/hide the data load drop box.
   * @param show True to show the drop box.
   */
  showDropbox = (app, show) => {
    const box = document.getElementById(this.state.dropboxDivId);
    if (!box) {
      return;
    }
    const layerDiv = document.getElementById('layerGroup0');

    if (show) {
      // reset css class
      box.className = this.state.dropboxClassName + ' ' + this.state.borderClassName;
      // check content
      if (box.innerHTML === '') {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode('Drag and drop data here or '));
        // input file
        const input = document.createElement('input');
        input.onchange = this.onInputFile;
        input.type = 'file';
        input.multiple = true;
        input.id = 'input-file';
        input.style.display = 'none';
        const label = document.createElement('label');
        label.htmlFor = 'input-file';
        const link = document.createElement('a');
        link.appendChild(document.createTextNode('click here'));
        link.id = 'input-file-link';
        label.appendChild(link);
        p.appendChild(input);
        p.appendChild(label);

        box.appendChild(p);
      }
      // show box
      box.setAttribute('style', 'display:initial');
      // stop layer listening
      if (layerDiv) {
        layerDiv.removeEventListener('dragover', this.defaultHandleDragEvent);
        layerDiv.removeEventListener('dragleave', this.defaultHandleDragEvent);
        layerDiv.removeEventListener('drop', this.onDrop);
      }
      // listen to box events
      box.addEventListener('dragover', this.onBoxDragOver);
      box.addEventListener('dragleave', this.onBoxDragLeave);
      box.addEventListener('drop', this.onDrop);
    } else {
      // remove border css class
      box.className = this.state.dropboxClassName;
      // remove content
      box.innerHTML = '';
      // hide box
      box.setAttribute('style', 'display:none');
      // stop box listening
      box.removeEventListener('dragover', this.onBoxDragOver);
      box.removeEventListener('dragleave', this.onBoxDragLeave);
      box.removeEventListener('drop', this.onDrop);
      // listen to layer events
      if (layerDiv) {
        layerDiv.addEventListener('dragover', this.defaultHandleDragEvent);
        layerDiv.addEventListener('dragleave', this.defaultHandleDragEvent);
        layerDiv.addEventListener('drop', this.onDrop);
      }
    }
  }

  // drag and drop [end] -------------------------------------------------------

} // DwvComponent

DwvComponent.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(DwvComponent);
