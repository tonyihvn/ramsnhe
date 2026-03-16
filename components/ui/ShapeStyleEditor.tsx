import React, { useState, useEffect } from 'react';

interface ShapeStyle {
    fill: string;
    stroke: string;
    strokeWidth: number;
    width: number;
    height: number;
    rx?: number;
    ry?: number;
}

interface ShapeStyleEditorProps {
    html: string;
    shapeType: 'rect' | 'circle' | 'line' | 'polygon' | 'unknown';
    onChange: (updatedHtml: string, style: ShapeStyle) => void;
}

const ShapeStyleEditor: React.FC<ShapeStyleEditorProps> = ({ html, shapeType, onChange }) => {
    const [style, setStyle] = useState<ShapeStyle>({
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        width: 160,
        height: 100,
    });

    const [displayStyle, setDisplayStyle] = useState<ShapeStyle>(style);

    // Parse SVG/HTML to extract current styling
    useEffect(() => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const svgElement = doc.querySelector('svg');
            const shapeElement = doc.querySelector('rect, circle, line, polygon, ellipse');

            if (shapeElement) {
                const newStyle: ShapeStyle = {
                    fill: shapeElement.getAttribute('fill') || '#ffffff',
                    stroke: shapeElement.getAttribute('stroke') || '#000000',
                    strokeWidth: Number(shapeElement.getAttribute('stroke-width') || '2'),
                    width: Number(shapeElement.getAttribute('width') || svgElement?.getAttribute('width') || '160'),
                    height: Number(shapeElement.getAttribute('height') || svgElement?.getAttribute('height') || '100'),
                    rx: shapeElement.getAttribute('rx') ? Number(shapeElement.getAttribute('rx')) : undefined,
                    ry: shapeElement.getAttribute('ry') ? Number(shapeElement.getAttribute('ry')) : undefined,
                };
                setStyle(newStyle);
                setDisplayStyle(newStyle);
            }
        } catch (e) {
            console.error('Failed to parse shape HTML:', e);
        }
    }, [html]);

    const handleStyleChange = (key: keyof ShapeStyle, value: any) => {
        const updatedStyle = { ...displayStyle, [key]: value };
        setDisplayStyle(updatedStyle);

        // Update the actual HTML with new styles
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const svgElement = doc.querySelector('svg');
            const shapeElement = doc.querySelector('rect, circle, line, polygon, ellipse');

            if (shapeElement && svgElement) {
                // Update SVG viewBox/dimensions
                if (key === 'width' || key === 'height') {
                    svgElement.setAttribute('width', String(updatedStyle.width));
                    svgElement.setAttribute('height', String(updatedStyle.height));
                    svgElement.setAttribute('viewBox', `0 0 ${updatedStyle.width} ${updatedStyle.height}`);
                }

                // Update shape attributes
                if (key === 'fill') shapeElement.setAttribute('fill', String(value));
                if (key === 'stroke') shapeElement.setAttribute('stroke', String(value));
                if (key === 'strokeWidth') shapeElement.setAttribute('stroke-width', String(value));

                // Update dimensions for specific shapes
                if (shapeElement.tagName.toLowerCase() === 'rect') {
                    if (key === 'width') shapeElement.setAttribute('width', String(value));
                    if (key === 'height') shapeElement.setAttribute('height', String(value));
                    if (key === 'rx' && value) shapeElement.setAttribute('rx', String(value));
                    if (key === 'ry' && value) shapeElement.setAttribute('ry', String(value));
                } else if (shapeElement.tagName.toLowerCase() === 'circle') {
                    const radius = Math.min(updatedStyle.width, updatedStyle.height) / 2;
                    shapeElement.setAttribute('r', String(radius));
                    shapeElement.setAttribute('cx', String(updatedStyle.width / 2));
                    shapeElement.setAttribute('cy', String(updatedStyle.height / 2));
                } else if (shapeElement.tagName.toLowerCase() === 'line') {
                    shapeElement.setAttribute('x2', String(updatedStyle.width));
                    shapeElement.setAttribute('y2', String(updatedStyle.height));
                }

                const updatedHtml = doc.documentElement.innerHTML;
                onChange(updatedHtml, updatedStyle);
            }
        } catch (e) {
            console.error('Failed to update shape styling:', e);
        }
    };

    return (
        <div className="space-y-3 mt-3 p-2 border rounded bg-gray-50 text-xs">
            <div className="font-medium">Shape Styling</div>

            {/* Shape Type Badge */}
            <div className="text-xs text-gray-600">
                Type: <span className="inline-block bg-blue-100 px-2 py-0.5 rounded text-xs font-semibold capitalize">{shapeType}</span>
            </div>

            {/* Fill Color */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fill Color</label>
                <div className="flex gap-2 items-center">
                    <input
                        type="color"
                        value={displayStyle.fill}
                        onChange={(e) => handleStyleChange('fill', e.target.value)}
                        className="w-10 h-8 border rounded cursor-pointer"
                    />
                    <input
                        type="text"
                        value={displayStyle.fill}
                        onChange={(e) => handleStyleChange('fill', e.target.value)}
                        className="flex-1 border p-1 rounded text-xs font-mono"
                        placeholder="#ffffff"
                    />
                </div>
            </div>

            {/* Stroke Color */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Stroke Color</label>
                <div className="flex gap-2 items-center">
                    <input
                        type="color"
                        value={displayStyle.stroke}
                        onChange={(e) => handleStyleChange('stroke', e.target.value)}
                        className="w-10 h-8 border rounded cursor-pointer"
                    />
                    <input
                        type="text"
                        value={displayStyle.stroke}
                        onChange={(e) => handleStyleChange('stroke', e.target.value)}
                        className="flex-1 border p-1 rounded text-xs font-mono"
                        placeholder="#000000"
                    />
                </div>
            </div>

            {/* Stroke Width */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Stroke Width</label>
                <div className="flex gap-2 items-center">
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={displayStyle.strokeWidth}
                        onChange={(e) => handleStyleChange('strokeWidth', parseFloat(e.target.value))}
                        className="flex-1"
                    />
                    <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={displayStyle.strokeWidth}
                        onChange={(e) => handleStyleChange('strokeWidth', parseFloat(e.target.value))}
                        className="w-12 border p-1 rounded text-xs"
                    />
                </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
                    <div className="flex gap-1 items-center">
                        <input
                            type="number"
                            min="20"
                            max="1000"
                            value={displayStyle.width}
                            onChange={(e) => handleStyleChange('width', parseFloat(e.target.value))}
                            className="flex-1 border p-1 rounded text-xs"
                        />
                        <span className="text-xs text-gray-500">px</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Height</label>
                    <div className="flex gap-1 items-center">
                        <input
                            type="number"
                            min="20"
                            max="1000"
                            value={displayStyle.height}
                            onChange={(e) => handleStyleChange('height', parseFloat(e.target.value))}
                            className="flex-1 border p-1 rounded text-xs"
                        />
                        <span className="text-xs text-gray-500">px</span>
                    </div>
                </div>
            </div>

            {/* Rounded Corners for Rectangles */}
            {shapeType === 'rect' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Radius X</label>
                        <div className="flex gap-1 items-center">
                            <input
                                type="number"
                                min="0"
                                max="50"
                                value={displayStyle.rx || '0'}
                                onChange={(e) => handleStyleChange('rx', parseFloat(e.target.value))}
                                className="flex-1 border p-1 rounded text-xs"
                            />
                            <span className="text-xs text-gray-500">px</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Radius Y</label>
                        <div className="flex gap-1 items-center">
                            <input
                                type="number"
                                min="0"
                                max="50"
                                value={displayStyle.ry || '0'}
                                onChange={(e) => handleStyleChange('ry', parseFloat(e.target.value))}
                                className="flex-1 border p-1 rounded text-xs"
                            />
                            <span className="text-xs text-gray-500">px</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview */}
            <div className="mt-3 p-2 bg-white border rounded">
                <div className="text-xs font-medium mb-2 text-gray-700">Preview</div>
                <div
                    dangerouslySetInnerHTML={{ __html: html }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '80px',
                        maxHeight: '150px',
                        overflow: 'hidden',
                    }}
                />
            </div>
        </div>
    );
};

export default ShapeStyleEditor;
