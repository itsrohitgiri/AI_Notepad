/* eslint-disable @typescript-eslint/no-unused-vars */
import { Group, Tooltip } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { SWATCHES } from '../../../constants';
import { BiEraser, BiPencil} from 'react-icons/bi'; // Icons
import './index.css'
import Cropper from 'react-cropper'; // Import react-cropper for cropping images
import 'cropperjs/dist/cropper.css'; // Import styles for Cropper



interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState({});
    const [result, setResult] = useState<GeneratedResult>();
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [bgColor, setBgColor] = useState('black');
    const [isEraser, setIsEraser] = useState(false);
    const [eraserSize, setEraserSize] = useState(10); // Default eraser size
    const [isPencil, setIsPencil] = useState(false); // Track if pencil is selected
    const [shapeMode, setShapeMode] = useState(false); // Whether shape drawing is active
    const [shapeType, setShapeType] = useState<'line' | 'rectangle' | 'circle' | null>(null); // Selected shape type
    const [showTools, setShowTools] = useState(false);
    const redoStack = useRef<ImageData[]>([]);
    const lastPos = useRef({ x: 0, y: 0 });
    const undoStack = useRef<Array<ImageData>>([]);
    const [isTextBoxVisible, setIsTextBoxVisible] = useState(false);
    const [textBoxPosition, setTextBoxPosition] = useState({ x: 100, y: 100 });
    const fileInputRef = useRef(null);
    const [fileUploaded, setFileUploaded] = useState(false); // Track file upload status
    const [showMedia, setShowMedia] = useState(false); // State to control media button visibility
    const [image, setImage] = useState(null); // The selected image data
    const [croppedImage, setCroppedImage] = useState(null); // The cropped image data
    const cropperRef = useRef(null); // Reference to cropper
    const [isCropped, setIsCropped] = useState(false); // State to track if the image has been cropped


    // Effect for LaTeX rendering
    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            try {
                setTimeout(() => {
                    window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
                }, 0);
            } catch (error) {
                console.error('MathJax rendering error:', error);
            }
        }
    }, [latexExpression]);
    

    // Effect to update canvas when background color changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    }, [bgColor]);

    // Clear the canvas when reset is triggered
    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]); // Clear latex expression after reset
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    const resetLatex = () => {
        setLatexExpression([]); // Clear the LaTeX expressions
        setResult(undefined);   // Reset the result state if needed
    };
    

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

     // Save the current state of the canvas
     const saveCanvasState = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                redoStack.current = [];
                undoStack.current.push(imageData);
            }
        }
    };

    const handleAddToCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      const img = new Image();
      img.src = croppedImage;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before adding new image
        ctx.drawImage(img, 0, 0); // Add cropped image
    
        // Reposition latex result to the center
        setLatexPosition({ x: canvas.width / 2, y: canvas.height / 2 });  // Adjust as needed
      };
    
      // Hide the cropping tool once image is added
      setIsCropped(false);
    };
    

   // Handle image file input change
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result); // Set the image source in state
        setFileUploaded(true); // Mark the file as uploaded
        setIsCropped(false); // Reset the crop state
      };
      reader.readAsDataURL(file);
    }
  };

  // Crop the image and store the result
  const handleCrop = () => {
    if (cropperRef.current) {
      const cropperInstance = cropperRef.current?.cropper; // Access the Cropper instance
      if (cropperInstance) {
        const croppedCanvas = cropperInstance.getCroppedCanvas();
        if (croppedCanvas) {
          setCroppedImage(croppedCanvas.toDataURL()); // Save the cropped image
          setIsCropped(true); // Mark the image as cropped
        }
      }
    }
  };

  // Add the cropped image to the canvas
  const addCroppedImageToCanvas = () => {
    if (croppedImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.src = croppedImage;
      img.onload = () => {
        canvas.width = img.width; // Set the canvas width to the cropped image width
        canvas.height = img.height; // Set the canvas height to the cropped image height
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing the new image
        ctx.drawImage(img, 0, 0); // Draw the cropped image
      };
    }
    setIsCropped(false);
    setImage(null);  // Reset the image state to hide the cropper container
  };
    

    // Undo function
    const undoLastStroke = () => {
        const canvas = canvasRef.current;
        if (canvas && undoStack.current.length > 0) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                redoStack.current.push(currentImageData); // Save current state to redoStack
                const lastUndoImageData = undoStack.current.pop(); // Get the last undo state
                if (lastUndoImageData) {
                    ctx.putImageData(lastUndoImageData, 0, 0); // Restore to canvas
                }
            }
        }
    };

    // Redo function
    const redoLastStroke = () => {
        const canvas = canvasRef.current;
        if (canvas && redoStack.current.length > 0) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const lastRedoImageData = redoStack.current.pop(); // Pop from redoStack
                if (lastRedoImageData) {
                    ctx.putImageData(lastRedoImageData, 0, 0); // Apply to canvas
                    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    undoStack.current.push(currentImageData); // Save to undoStack before redo
                }
            }
        }
    };
    

    const renderLatexToCanvas = (expression: string, answer: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
  
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
  
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      // LaTeX formatted result with \text{} for proper word spacing
      const latex = `\\(\\LARGE{${expression}\\text{ = }${answer}}\\)`;
  
      // Measure the LaTeX string as it is rendered by the canvas context
      const estimatedWidth = ctx.measureText(`${expression} = ${answer}`).width;
  
      // If the width exceeds the canvas, break it into multiple lines
      let adjustedLatex;
      if (estimatedWidth > canvasWidth * 0.9) {
          const maxCharactersPerLine = Math.floor((canvasWidth * 0.9) / 15); // Estimate based on font size
          const lines = [];
  
          let currentLine = '';
          for (const char of `${expression} = ${answer}`) {
              currentLine += char;
              if (currentLine.length >= maxCharactersPerLine) {
                  lines.push(currentLine);
                  currentLine = '';
              }
          }
          if (currentLine) lines.push(currentLine);
  
          adjustedLatex = lines.map((line) => `\\(\\LARGE{${line}}\\)`).join('<br>');
      } else {
          adjustedLatex = latex;
      }
  
      // Adjust position to center horizontally and stay within the canvas
      const adjustedX = (canvasWidth - estimatedWidth) / 2; // Center the LaTeX expression horizontally
      const adjustedY = Math.min(Math.max(latexPosition.y, 10), canvasHeight - 100); // Ensure Y-position is within canvas bounds
  
      setLatexPosition({ x: adjustedX, y: adjustedY });
      setLatexExpression([...latexExpression, adjustedLatex]); // Update LaTeX expressions
  
      if (maxWidthReached) {
          const additionalHeight = (estimatedWidth / canvasWidth) * 100; // Calculate additional height based on the width
          setCanvasHeight(canvasHeight + additionalHeight); // Extend canvas height if needed
      }
  };
  

    
    

    const runRoute = async () => {
        const canvas = canvasRef.current;

        if (canvas) {
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                },
            });

            const resp = await response.data;
            console.log('Response', resp);
            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result,
                    });
                }
            });

            // Determine latex position
            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) { // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            setLatexPosition({ x: centerX, y: centerY });

            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result,
                    });
                    renderLatexToCanvas(data.expr, data.result); // Render latex result
                }, 1000);
            });
        }
    };

    const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);

const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
  e.preventDefault();
  const { offsetX, offsetY } = e.nativeEvent;
  if (shapeMode) {
    setShapeStart({ x: offsetX, y: offsetY });
  } else {
    saveCanvasState();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
        lastPos.current = { x: offsetX, y: offsetY };
      }
    }
  }
};


const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (shapeMode && shapeStart) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { offsetX, offsetY } = e.nativeEvent;
          const { x: startX, y: startY } = shapeStart;
  
          ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
          ctx.fillStyle = bgColor; // Restore background color
          ctx.fillRect(0, 0, canvas.width, canvas.height); // Redraw background
          const lastImageData = undoStack.current[undoStack.current.length - 1];
          if (lastImageData) ctx.putImageData(lastImageData, 0, 0); // Restore last state
  
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
  
          if (shapeType === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
          } else if (shapeType === 'rectangle') {
            ctx.strokeRect(
              startX,
              startY,
              offsetX - startX,
              offsetY - startY
            );
          } else if (shapeType === 'circle') {
            const radius = Math.sqrt(
              Math.pow(offsetX - startX, 2) + Math.pow(offsetY - startY, 2)
            );
            ctx.beginPath();
            ctx.arc(startX, startY, radius, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
    } else if (!shapeMode && isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const currentPos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
          ctx.lineWidth = isEraser ? eraserSize : 3;
          ctx.strokeStyle = isEraser ? bgColor : color;
          ctx.lineTo(currentPos.x, currentPos.y);
          ctx.stroke();
          lastPos.current = currentPos;
        }
      }
    }
  };
  

  const stopDrawing = () => {
    if (shapeMode && shapeStart) {
      saveCanvasState(); // Save canvas state after drawing
      setShapeStart(null); // Reset shape start position
    }
    setIsDrawing(false);
  };
  

    const preventScroll = (e: Event) => {
        e.preventDefault();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('wheel', preventScroll, { passive: false });
            canvas.addEventListener('touchmove', preventScroll, { passive: false });
            return () => {
                canvas.removeEventListener('wheel', preventScroll);
                canvas.removeEventListener('touchmove', preventScroll);
            };
        }
    }, []);

    let yPosition = 20; // Starting Y position for the first text

    const addTextToCanvas = (text) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set font and color
      ctx.font = '20px Arial';
      ctx.fillStyle = color; // Use the selected color
      
      // Calculate X and Y positions
      const textWidth = ctx.measureText(text).width;
      const x = (canvas.width - textWidth) / 2; // Center text horizontally
      yPosition = yPosition || 30; // Initialize yPosition if undefined
      
      // Draw the text
      ctx.fillText(text, x, yPosition);
      
      // Increment Y position for the next text
      yPosition += 30; // Adjust spacing based on desired line height
      
      // Reset Y position if it exceeds the canvas height
      if (yPosition > canvas.height) {
        yPosition = 30; // Start over from the top
      }
    };
    

    

    const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 100); // Initial canvas height

useEffect(() => {
    // Update the background color of the body
    document.body.style.backgroundColor = bgColor;
    document.body.style.margin = '0';  // Remove any default margins
    document.body.style.height = '100vh';  // Make sure the body takes full height of the viewport

    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Resize the canvas
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            ctx.lineCap = 'round';
            ctx.lineWidth = 3;

            // Redraw the background color
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill entire canvas with background color
        }
    }

    // Handle resizing
    const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height); // Redraw background
            }
        }
    };

    resizeCanvas(); // Set initial size
    window.addEventListener('resize', resizeCanvas); // Update on window resize

    // Cleanup when the component unmounts or bgColor changes
    return () => {
        document.body.style.backgroundColor = ''; // Reset the background color
        window.removeEventListener('resize', resizeCanvas); // Cleanup event listener
    };
}, [bgColor]); // Re-run when background color changes

const cursorStyle = isEraser
    ? 'url(https://img.icons8.com/color/30/eraser.png), auto' // Eraser icon
    : isPencil
    ? 'url(https://img.icons8.com/officel/30/pencil-tip.png), auto' // Pencil icon
    : 'url(https://img.icons8.com/officel/30/pencil-tip.png), auto'; // Default cursor when no tool is selected

    const TextBox = ({ onAddText }) => {
      const [text, setText] = useState('');
      const [position, setPosition] = useState({ x: textBoxPosition.x, y: textBoxPosition.y });
    
      const handleAddText = () => {
        if (text.trim()) {
          onAddText(text, position.x, position.y);
          setIsTextBoxVisible(false);
        }
      };
    
      return (
        <div
  style={{
    position: 'absolute',
    top: position.y,
    left: position.x,
    zIndex: 10,
    background: 'linear-gradient(135deg, #1e1e2f, #3b3b5c)',
    border: '1px solid #4b4b6b',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    color: 'white',
    padding: '12px 16px',
    width: 'auto', // Auto-width to fit content
    height: 'auto', // Auto-height to fit content
    minWidth: '220px', // Set a minimum width to maintain a clean look
    display: 'inline-block', // Makes div adjust according to content
  }}
>
  <div className="input-group">
    <label htmlFor="textInput" className="input-group__label">
      Enter Text
    </label>
    <textarea
      id="textInput"
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Enter your text here..."
      className="input-group__input"
    />
  </div>
  <button
    onClick={handleAddText}
    style={{
      display: 'block',
      marginTop: '12px',
      background: 'linear-gradient(135deg, #4e73df, #4b52c9)',
      color: bgColor === 'white' ? 'black' : 'white',
      padding: '12px 20px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      border: 'none',
      transition: 'all 0.3s ease-in-out',
      boxShadow: '0 6px 15px rgba(0, 0, 0, 0.2)',
    }}
    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'} 
    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'} 
  >
    Add Text
  </button>
</div>

      );
      
    };            
    
    

    return (
        <><center>
            <div className="inline-flex space-x-4 items-center p-2 flex-wrap rounded-lg">
            <Tooltip label="Eraser" withArrow>
      <button
        onClick={() => {
          setIsEraser((prev) => !prev);
          if (!isEraser) setIsPencil(false); // Close pencil if eraser is selected
          setShapeMode(false); // Disable shape mode
          setShapeType(null);  // Reset shape type
        }} 
        className="toolbar-button rounded-full"
      >
        <BiEraser size={20} className={`icon ${isEraser ? 'active' : ''}`} />
      </button>
    </Tooltip>

    {/* Conditional rendering of the eraser size slider */}
    {isEraser && (
      <input
        type="range"
        min={5}
        max={30}
        value={eraserSize}
        onChange={(e) => setEraserSize(Number(e.target.value))}
        className="eraser-size-range"
      />
    )}

    <Tooltip label="Pencil" withArrow>
      <button
        onClick={() => {
          setIsPencil((prev) => !prev);
          if (!isPencil) setIsEraser(false); // Close eraser if pencil is selected
          setShapeMode(false); // Disable shape mode
          setShapeType(null);  // Reset shape type
        }} 
        className="toolbar-button rounded-full"
      >
        <BiPencil size={20} className={`icon ${isPencil ? 'active' : ''}`} />
      </button>
    </Tooltip>

    {/* Conditional rendering of the color palette */}
    {isPencil && (
      <Group className="color-swatch-container">
        {SWATCHES.map((swatch, index) => (
          <div
            key={index}
            className={`color-swatch ${color === swatch ? 'active-color' : ''}`} // Add 'active-color' class if it's the active color
            onClick={() => setColor(swatch)} // Set the active color
            style={{ backgroundColor: swatch }} // Set swatch color
          ></div>
        ))}
      </Group>
    )}

<div className="toolbar">
      {/* Main toolbar icon */}
      <button
        onClick={() => setShowTools((prev) => !prev)}
        className="toolbar-button rounded-full"
      >
        <img src="https://img.icons8.com/external-tal-revivo-color-tal-revivo/20/external-assorted-shape-tool-selector-for-designing-application-text-color-tal-revivo.png" alt="Toolbar" />
      </button>

      {/* Conditional rendering of the tools */}
      {showTools && (
        <div className="tools-container">
             {/* Line Tool */}
          <Tooltip label="Draw Line" withArrow>
            <button
              onClick={() => {
                setShapeMode(true);
                setShapeType('line');
                setIsPencil(false); // Disable pencil
                setIsEraser(false);
              }}
              className={`toolbar-button rounded-full ${shapeType === 'line' ? 'active' : ''}`}
            >
              <img src="https://img.icons8.com/ios-filled/20/line.png" alt="Line" />
            </button>
          </Tooltip>

          {/* Rectangle Tool */}
          <Tooltip label="Draw Rectangle" withArrow>
            <button
              onClick={() => {
                setShapeMode(true);
                setShapeType('rectangle');
                setIsPencil(false); // Disable pencil
                setIsEraser(false);
              }}
              className={`toolbar-button rounded-full ${shapeType === 'rectangle' ? 'active' : ''}`}
            >
              <img src="https://img.icons8.com/fluency-systems-regular/20/rounded-rectangle.png" alt="Rectangle" />
            </button>
          </Tooltip>

          {/* Circle Tool */}
          <Tooltip label="Draw Circle" withArrow>
            <button
              onClick={() => {
                setShapeMode(true);
                setShapeType('circle');
                setIsPencil(false); // Disable pencil
                setIsEraser(false);
              }}
              className={`toolbar-button rounded-full ${shapeType === 'circle' ? 'active' : ''}`}
            >
              <img src="https://img.icons8.com/ios-filled/20/circled.png" alt="Circle" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>

    <Tooltip label="Text Box" withArrow>
  <button
    onClick={() => setIsTextBoxVisible(true)}
    className="toolbar-button rounded-full"
  >
    <img
      src="https://img.icons8.com/pulsar-color/20/text-input-form.png"
      alt="Text Box"
    />
  </button>
</Tooltip>

<div className="toolbar">
      {/* Media button to toggle image upload visibility */}
      <button
        onClick={() => setShowMedia((prev) => !prev)} // Toggle the media visibility
        className="toolbar-button rounded-full"
      >
        <img
          src="https://img.icons8.com/doodle/20/media.png"
          alt="Toolbar"
        />
      </button>

      {/* Conditionally render the image upload section based on showMedia state */}
      {/* Conditionally render the image upload section based on showMedia state */}
      {showMedia && (
        <div className="tools-container">
          {/* Image Upload Button */}
          <Tooltip label="Upload Image" withArrow>
            <button
              onClick={() => fileInputRef.current.click()}
              className={`toolbar-button rounded-full ${fileUploaded ? "uploaded" : ""}`}
            >
              {fileUploaded ? (
                <img
                  src="https://img.icons8.com/ios-filled/20/checkmark.png"
                  alt="File Uploaded"
                />
              ) : (
                <img
                  src="https://img.icons8.com/plasticine/20/image.png"
                  alt="Image Upload"
                />
              )}
            </button>
          </Tooltip>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            ref={fileInputRef}
            style={{ display: "none" }}
          />
        </div>
      )}

{image && !isCropped && (
        <div className="cropper-container">
          <Cropper
            src={image}
            ref={cropperRef}
            style={{ height: 400, width: "100%" }}
            aspectRatio={1}
            guides={false}
            cropBoxResizable={false}
          />
          <button className="crop-button" onClick={handleCrop}>Crop Image</button>
        </div>
      )}

      {isCropped && (
        <div className="cropped-image-container">
          <h3>Preview Cropped Image</h3>
          <img src={croppedImage} alt="Cropped" className="cropped-image" />
          <button className="add-to-canvas-button" onClick={addCroppedImageToCanvas}>Add Cropped Image to Canvas</button>
        </div>
      )}


      {/* Styling */}
      <style>
        {`.cropper-container {
            margin-top: 20px;
            text-align: center;
          }

          .crop-button {
            margin-top: 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
          }

          .crop-button:hover {
            background-color: #45a049;
          }

          .cropped-image-container {
            margin-top: 20px;
            text-align: center;
          }

          .cropped-image {
            width: 200px;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 10px;
          }

          .add-to-canvas-button {
            background-color: #008CBA;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
          }

          .add-to-canvas-button:hover {
            background-color: #007B8D;
          }

          .canvas-container {
            margin-top: 30px;
            display: flex;
            justify-content: center;
          }

          h3 {
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }
        `}
      </style>
    </div>
                <Tooltip label="Undo" withArrow>
                    <button className="toolbar-button rounded-full" onClick={undoLastStroke}>
                        <img src="https://img.icons8.com/stickers/20/undo.png" alt="undo" />
                    </button>
                </Tooltip>
                <Tooltip label="Redo" withArrow>
                    <button className="toolbar-button rounded-full" onClick={redoLastStroke}>
                        <img src="https://img.icons8.com/stickers/20/redo.png" alt="redo" />
                    </button>
                </Tooltip>
                <Tooltip label="Background Color" withArrow>
                    <button className="toolbar-button rounded-full" onClick={() => setBgColor(prompt('Enter a color or hex value') || 'black')}>
                    <img
                        src="https://img.icons8.com/arcade/20/color-palette.png"
                        alt="Background Color"
                    />
                    </button>
                </Tooltip>
                <Tooltip label="Reset Canvas" withArrow>
                    <button className="toolbar-button rounded-full" onClick={() => setReset(true)}>
                        <img src="https://img.icons8.com/stickers/20/restart.png" alt="Reset" />
                    </button>
                </Tooltip>
                <Tooltip label="Solve By AI" withArrow>
                <button className="toolbar-button rounded-full" onClick={runRoute}>
                <img
                      src="/icons8-ai-ezgif.com-loop-count.gif"
                      width="30px"
                      height="20px"
                      alt="AI Button"
                      style={{ display: "block" }}
                />

                </button>
                </Tooltip>
                <Tooltip label="Reset LaTeX Results" withArrow>
                <button className="toolbar-button rounded-full" onClick={resetLatex}>
                <img src="https://img.icons8.com/arcade/20/undelete.png" alt="Reset Latex" />
                </button>
                </Tooltip>

            </div>
            </center>

            {isTextBoxVisible && (
              <TextBox onAddText={(text, x, y) => addTextToCanvas(text, x, y)} />
            )}


            <div className='cursor-area' style={{ cursor:cursorStyle, backgroundColor: bgColor, height: '100vh', width: '100vw', position: 'relative' }}>
                {/* Canvas and Latex result container */}
                <canvas
                    ref={canvasRef}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerOut={stopDrawing}
                />
                {/* Displaying latex expressions */}
                <div
                    id="latex-result"
                    style={{
                      position: 'absolute',
                      top: '50%', // Center vertically
                      left: '50%', // Center horizontally
                      transform: 'translate(-50%, -50%)', // Adjust for the text's width and height
                      color: bgColor === 'white' ? 'black' : 'white', // Contrast with background
                      fontSize: '20px',
                      textAlign: 'center', // Center the text horizontally
                      backgroundColor: bgColor === 'white' ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
                      padding: '10px', // Add padding for better readability
                      borderRadius: '8px',
                      wordWrap: 'break-word', // Break long words
                      overflowWrap: 'break-word', // Handle overflow
                      maxWidth: `${canvasRef.current?.width || 800}px`, // Restrict width to canvas size
                      lineHeight: '1.5', // Adjust line spacing for better readability
                    }}
                    dangerouslySetInnerHTML={{
                        __html: latexExpression.join('<br>'), // Render as HTML for multi-line support
                    }}
                />
            </div>    
        </>
    );
}
