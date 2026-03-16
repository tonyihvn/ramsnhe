import React, { useRef, useState, useEffect } from 'react';
import Button from './Button';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedDataUrl: string) => void;
    onCancel: () => void;
    aspectRatio?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
    imageSrc,
    onCropComplete,
    onCancel,
    aspectRatio
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [displayScale, setDisplayScale] = useState(1);

    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imageRef.current = img;

            // Calculate display scale and initial crop box
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const scale = Math.min(1, containerWidth / img.width);
                setDisplayScale(scale);

                // Initialize crop box to 80% of image
                const w = img.width * 0.8;
                const h = aspectRatio ? w / aspectRatio : img.height * 0.8;
                setCropBox({
                    x: (img.width - w) / 2,
                    y: (img.height - h) / 2,
                    width: w,
                    height: h,
                });
            }
            setIsLoading(false);
        };
        img.onerror = () => {
            setIsLoading(false);
            alert('Failed to load image');
        };
        img.src = imageSrc;
    }, [imageSrc, aspectRatio]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / displayScale;
        const y = (e.clientY - rect.top) / displayScale;

        // Check if click is within crop box (with some tolerance)
        const tolerance = 10;
        if (
            x >= cropBox.x - tolerance &&
            x <= cropBox.x + cropBox.width + tolerance &&
            y >= cropBox.y - tolerance &&
            y <= cropBox.y + cropBox.height + tolerance
        ) {
            setIsDragging(true);
            setDragStart({ x, y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !imageRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / displayScale;
        const y = (e.clientY - rect.top) / displayScale;

        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;

        let newX = cropBox.x + deltaX;
        let newY = cropBox.y + deltaY;

        // Constrain within image bounds
        newX = Math.max(0, Math.min(newX, imageRef.current.width - cropBox.width));
        newY = Math.max(0, Math.min(newY, imageRef.current.height - cropBox.height));

        setCropBox({ ...cropBox, x: newX, y: newY });
        setDragStart({ x, y });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleCrop = () => {
        if (!canvasRef.current || !imageRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = cropBox.width;
        canvas.height = cropBox.height;

        ctx.drawImage(
            imageRef.current,
            cropBox.x,
            cropBox.y,
            cropBox.width,
            cropBox.height,
            0,
            0,
            cropBox.width,
            cropBox.height
        );

        const croppedDataUrl = canvas.toDataURL('image/png');
        onCropComplete(croppedDataUrl);
    };

    const handleResizeHandle = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
        if (!imageRef.current) return;
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startBox = { ...cropBox };

        const handleMouseMoveResize = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            const scaledDeltaX = deltaX / displayScale;
            const scaledDeltaY = deltaY / displayScale;

            let newBox = { ...startBox };

            if (handle.includes('right')) {
                newBox.width = Math.min(
                    startBox.width + scaledDeltaX,
                    imageRef.current.width - startBox.x
                );
            }
            if (handle.includes('bottom')) {
                newBox.height = Math.min(
                    startBox.height + scaledDeltaY,
                    imageRef.current.height - startBox.y
                );
            }
            if (handle.includes('left')) {
                const newWidth = startBox.width - scaledDeltaX;
                if (newWidth > 50) {
                    newBox.x = startBox.x + scaledDeltaX;
                    newBox.width = newWidth;
                }
            }
            if (handle.includes('top')) {
                const newHeight = startBox.height - scaledDeltaY;
                if (newHeight > 50) {
                    newBox.y = startBox.y + scaledDeltaY;
                    newBox.height = newHeight;
                }
            }

            // Enforce aspect ratio if set
            if (aspectRatio && handle.includes('right')) {
                newBox.height = newBox.width / aspectRatio;
            } else if (aspectRatio && handle.includes('bottom')) {
                newBox.width = newBox.height * aspectRatio;
            }

            setCropBox(newBox);
        };

        const handleMouseUpResize = () => {
            document.removeEventListener('mousemove', handleMouseMoveResize);
            document.removeEventListener('mouseup', handleMouseUpResize);
        };

        document.addEventListener('mousemove', handleMouseMoveResize);
        document.addEventListener('mouseup', handleMouseUpResize);
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="text-sm text-gray-600">
                Drag to move the crop area, or use the handles to resize. Click Crop when done.
            </div>

            {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading image...</div>
            ) : (
                <div
                    ref={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="relative bg-gray-100 rounded overflow-auto flex items-center justify-center"
                    style={{
                        height: 400,
                        cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                >
                    {imageRef.current && (
                        <div
                            style={{
                                position: 'relative',
                                width: imageRef.current.width * displayScale,
                                height: imageRef.current.height * displayScale,
                            }}
                        >
                            <img
                                src={imageSrc}
                                alt="Crop preview"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    userSelect: 'none',
                                }}
                            />

                            {/* Crop box overlay */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: cropBox.x * displayScale,
                                    top: cropBox.y * displayScale,
                                    width: cropBox.width * displayScale,
                                    height: cropBox.height * displayScale,
                                    border: '2px solid #3b82f6',
                                    boxShadow: 'inset 0 0 0 9999px rgba(0, 0, 0, 0.5)',
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                }}
                            >
                                {/* Resize handles */}
                                {[
                                    { pos: 'top-left', cursor: 'nwse-resize' },
                                    { pos: 'top-right', cursor: 'nesw-resize' },
                                    { pos: 'bottom-left', cursor: 'nesw-resize' },
                                    { pos: 'bottom-right', cursor: 'nwse-resize' },
                                    { pos: 'top', cursor: 'ns-resize' },
                                    { pos: 'bottom', cursor: 'ns-resize' },
                                    { pos: 'left', cursor: 'ew-resize' },
                                    { pos: 'right', cursor: 'ew-resize' },
                                ].map(({ pos, cursor }) => (
                                    <div
                                        key={pos}
                                        onMouseDown={(e) => handleResizeHandle(e, pos)}
                                        style={{
                                            position: 'absolute',
                                            ...(pos.includes('top') && { top: -5 }),
                                            ...(pos.includes('bottom') && { bottom: -5 }),
                                            ...(pos.includes('left') && { left: -5 }),
                                            ...(pos.includes('right') && { right: -5 }),
                                            ...(pos.includes('top') && pos.includes('left') && { width: 15, height: 15 }),
                                            ...(pos.includes('top') && pos.includes('right') && { width: 15, height: 15 }),
                                            ...(pos.includes('bottom') && pos.includes('left') && { width: 15, height: 15 }),
                                            ...(pos.includes('bottom') && pos.includes('right') && { width: 15, height: 15 }),
                                            ...(pos === 'top' && { left: '50%', transform: 'translateX(-50%)', width: 30, height: 10 }),
                                            ...(pos === 'bottom' && { left: '50%', transform: 'translateX(-50%)', width: 30, height: 10 }),
                                            ...(pos === 'left' && { top: '50%', transform: 'translateY(-50%)', width: 10, height: 30 }),
                                            ...(pos === 'right' && { top: '50%', transform: 'translateY(-50%)', width: 10, height: 30 }),
                                            backgroundColor: '#3b82f6',
                                            borderRadius: 2,
                                            cursor,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleCrop} disabled={isLoading}>
                    Crop & Apply
                </Button>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default ImageCropper;
