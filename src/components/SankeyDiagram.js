import React, { useEffect, useRef } from 'react';

const SankeyDiagram = ({ data, companyName }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    // Load D3.js and Sankey script dynamically
    const loadScripts = async () => {
      // Load D3.js
      if (!window.d3) {
        const d3Script = document.createElement('script');
        d3Script.src = 'https://d3js.org/d3.v7.min.js';
        d3Script.async = true;
        document.head.appendChild(d3Script);
        
        await new Promise((resolve) => {
          d3Script.onload = resolve;
        });
      }

      // Load Sankey plugin
      if (!window.d3.sankey) {
        const sankeyScript = document.createElement('script');
        sankeyScript.src = 'https://unpkg.com/d3-sankey@0.12.3/dist/d3-sankey.min.js';
        sankeyScript.async = true;
        document.head.appendChild(sankeyScript);
        
        await new Promise((resolve) => {
          sankeyScript.onload = resolve;
        });
      }

      // Create the Sankey diagram
      if (window.d3 && window.d3.sankey && chartRef.current && data) {
        createSankeyDiagram(data);
      }
    };

    const createSankeyDiagram = (sankeyData) => {
      const svg = window.d3.select(chartRef.current);
      svg.selectAll("*").remove(); // Clear previous content

      const width = 800;
      const height = 400;

      svg.attr("width", width).attr("height", height);

      const { nodes, links } = window.d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 5], [width - 1, height - 5]])
        (sankeyData);

      // Create gradient definitions
      const defs = svg.append("defs");
      
      links.forEach(link => {
        const gradient = defs.append("linearGradient")
          .attr("id", `gradient-${link.index}`)
          .attr("x1", "0%")
          .attr("x2", "100%")
          .attr("y1", "0%")
          .attr("y2", "0%");

        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", link.source.color || "#FFCDD5")
          .attr("stop-opacity", 0.6);

        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", link.target.color || "#0E2B4D")
          .attr("stop-opacity", 0.8);
      });

      // Add links
      svg.append("g")
        .selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("d", window.d3.sankeyLinkHorizontal())
        .attr("stroke", (d, i) => `url(#gradient-${i})`)
        .attr("stroke-width", d => Math.max(1, d.width))
        .style("fill", "none")
        .style("opacity", 0.7)
        .on("mouseover", function() {
          window.d3.select(this).style("opacity", 1);
        })
        .on("mouseout", function() {
          window.d3.select(this).style("opacity", 0.7);
        });

      // Add nodes
      svg.append("g")
        .selectAll("rect")
        .data(nodes)
        .enter()
        .append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => d.color || "#0E2B4D")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          svg.selectAll("path")
            .style("opacity", link => 
              link.source === d || link.target === d ? 1 : 0.3
            );
        })
        .on("mouseout", function() {
          svg.selectAll("path")
            .style("opacity", 0.7);
        });

      // Add node labels
      svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.name)
        .style("font-size", "12px")
        .style("fill", "#0E2B4D")
        .style("font-weight", "500");
    };

    loadScripts();
  }, [data]);

  if (!data || !data.nodes || !data.links) {
    return (
      <div className="sankey-placeholder">
        No Sankey diagram data available for {companyName}
      </div>
    );
  }

  return (
    <div className="sankey-container">
      <h4 className="sankey-title">Data Flow: {companyName}</h4>
      <svg ref={chartRef} className="sankey-chart"></svg>
    </div>
  );
};

export default SankeyDiagram;
