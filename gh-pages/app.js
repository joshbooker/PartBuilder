// Global state
let attributesData = [];
let currentSelection = {
  masterClass: null,
  subClass: null,
  attributes: []
};
let currentOptionsPanel = {
  attrIndex: null,
  sortedAttributes: null
};

function escapeHTML(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

function initHorizontalBuilder(data) {
  attributesData = data;
  renderDropdowns();
}

function renderDropdowns() {
  const container = document.getElementById('dropdownsContainer');
  let html = '';
  
  html += createDropdown('masterClass', 'Master Class', 
    attributesData
      .map(mc => ({
        value: mc.MasterClassID,
        text: mc.CCode ? `${mc.CName} (${mc.CCode})` : mc.CName,
        code: mc.CCode || ''
      }))
      .sort((a, b) => (a.code || '').localeCompare(b.code || '')),
    false
  );
  
  html += createDropdown('subClass', 'Sub Class', [], true);
  html += '<div id="metallurgyDropdown"></div>';
  html += '<div id="attributeDropdowns"></div>';
  
  container.innerHTML = html;
  
  document.getElementById('select_masterClass').addEventListener('change', onMasterClassChange);
  document.getElementById('select_subClass').addEventListener('change', onSubClassChange);
}

function createDropdown(id, label, options, disabled) {
  const optionsHtml = [
    '<option value="">--</option>',
    ...options.map(opt => 
      `<option value="${opt.value}" data-code="${escapeHTML(opt.code || '')}">${escapeHTML((opt.text || '').toUpperCase())}</option>`
    )
  ].join('');
  
  return `
    <div class="dropdown-item" id="dropdown_${id}">
      <div class="code-display" id="code_${id}"></div>
      <div class="dropdown-label">${escapeHTML((label || '').toUpperCase())}</div>
      <select id="select_${id}" ${disabled ? 'disabled' : ''}>
        ${optionsHtml}
      </select>
    </div>
  `;
}

function onMasterClassChange(e) {
  const select = e.target;
  const masterClassId = parseInt(select.value);
  
  currentSelection.masterClass = null;
  currentSelection.subClass = null;
  currentSelection.attributes = [];
  clearAttributeDropdowns();
  hideOptionsPanel();
  hidePartNumber();
  
  if (isNaN(masterClassId)) {
    document.getElementById('code_masterClass').textContent = '';
    document.getElementById('select_subClass').disabled = true;
    document.getElementById('select_subClass').innerHTML = '<option value="">--</option>';
    document.getElementById('code_subClass').textContent = '';
    return;
  }
  
  const masterClass = attributesData.find(mc => mc.MasterClassID === masterClassId);
  currentSelection.masterClass = masterClass;
  
  document.getElementById('code_masterClass').textContent = (masterClass.CCode || '').toUpperCase();
  
  const subClassSelect = document.getElementById('select_subClass');
  if (masterClass.SubClasses && masterClass.SubClasses.length > 0) {
    const sortedSubClasses = masterClass.SubClasses
      .map((sc, idx) => ({ sc, idx }))
      .sort((a, b) => (a.sc.SCode || '').localeCompare(b.sc.SCode || ''));
    
    subClassSelect.disabled = false;
    subClassSelect.innerHTML = '<option value="">--</option>' + 
      sortedSubClasses.map(item => 
        `<option value="${item.idx}" data-code="${escapeHTML(item.sc.SCode)}">${escapeHTML((item.sc.SName || '').toUpperCase())} (${escapeHTML((item.sc.SCode || '').toUpperCase())})</option>`
      ).join('');
  } else {
    subClassSelect.disabled = true;
    subClassSelect.innerHTML = '<option value="">No sub classes</option>';
  }
  document.getElementById('code_subClass').textContent = '';
}

function onSubClassChange(e) {
  const select = e.target;
  const subClassIdx = parseInt(select.value);
  
  currentSelection.subClass = null;
  currentSelection.attributes = [];
  clearAttributeDropdowns();
  hideOptionsPanel();
  hidePartNumber();
  
  if (isNaN(subClassIdx)) {
    document.getElementById('code_subClass').textContent = '';
    return;
  }
  
  const subClass = currentSelection.masterClass.SubClasses[subClassIdx];
  currentSelection.subClass = subClass;
  
  document.getElementById('code_subClass').textContent = (subClass.SCode || '').toUpperCase();
  
  if (subClass.Attributes && subClass.Attributes.length > 0) {
    const sortedAttributes = [...subClass.Attributes].sort((a, b) => 
      (a.Sequence || 0) - (b.Sequence || 0)
    );
    renderAttributeDropdowns(sortedAttributes);
  }
}

function renderAttributeDropdowns(sortedAttributes) {
  const metallurgyContainer = document.getElementById('metallurgyDropdown');
  const otherContainer = document.getElementById('attributeDropdowns');
  let metallurgyHtml = '';
  let otherHtml = '';
  
  const metallurgyIndex = sortedAttributes.findIndex(attr => 
    attr.Attribute?.toLowerCase() === 'metallurgy'
  );
  const metallurgyAttr = metallurgyIndex >= 0 ? sortedAttributes[metallurgyIndex] : null;
  
  if (metallurgyAttr) {
    metallurgyHtml = createDropdown(`attr_${metallurgyIndex}`, metallurgyAttr.Attribute, [], false);
  }
  
  const otherAttributes = sortedAttributes.filter((attr, idx) => idx !== metallurgyIndex);
  otherAttributes.forEach((attr) => {
    const actualIndex = sortedAttributes.findIndex(a => a.AttributeID === attr.AttributeID);
    otherHtml += createDropdown(`attr_${actualIndex}`, attr.Attribute, [], true);
  });
  
  metallurgyContainer.innerHTML = metallurgyHtml;
  otherContainer.innerHTML = otherHtml;
  
  if (metallurgyAttr) {
    const select = document.getElementById(`select_attr_${metallurgyIndex}`);
    if (select) {
      select.addEventListener('change', (e) => onAttributeChange(metallurgyIndex, sortedAttributes));
      showOptionsPanel(metallurgyAttr, metallurgyIndex, sortedAttributes);
    }
  }
  
  otherAttributes.forEach((attr) => {
    const actualIndex = sortedAttributes.findIndex(a => a.AttributeID === attr.AttributeID);
    const select = document.getElementById(`select_attr_${actualIndex}`);
    if (select) {
      select.addEventListener('change', (e) => onAttributeChange(actualIndex, sortedAttributes));
    }
  });
}

function onAttributeChange(attrIndex, sortedAttributes) {
  const select = document.getElementById(`select_attr_${attrIndex}`);
  const optionIndex = parseInt(select.value);
  
  const attribute = sortedAttributes[attrIndex];
  const isMetallurgy = attribute?.Attribute?.toLowerCase() === 'metallurgy';
  
  const metallurgyIndex = sortedAttributes.findIndex(attr => 
    attr.Attribute?.toLowerCase() === 'metallurgy'
  );
  
  if (isMetallurgy) {
    for (let i = 0; i < sortedAttributes.length; i++) {
      if (i !== attrIndex) {
        const nextSelect = document.getElementById(`select_attr_${i}`);
        if (nextSelect) {
          nextSelect.value = '';
          nextSelect.disabled = true;
          document.getElementById(`code_attr_${i}`).textContent = '';
        }
      }
    }
    currentSelection.attributes = currentSelection.attributes.filter(a => {
      const fullAttr = sortedAttributes.find(attr => attr.AttributeID === a.attributeId);
      return fullAttr?.Attribute?.toLowerCase() === 'metallurgy';
    });
  } else {
    const currentSeq = attribute.Sequence || 0;
    for (let i = 0; i < sortedAttributes.length; i++) {
      const attr = sortedAttributes[i];
      if (attr.Attribute?.toLowerCase() !== 'metallurgy' && 
          (attr.Sequence || 0) > currentSeq) {
        const nextSelect = document.getElementById(`select_attr_${i}`);
        if (nextSelect) {
          nextSelect.value = '';
          nextSelect.disabled = true;
          document.getElementById(`code_attr_${i}`).textContent = '';
        }
      }
    }
    currentSelection.attributes = currentSelection.attributes.filter(a => {
      const fullAttr = sortedAttributes.find(attr => attr.AttributeID === a.attributeId);
      if (fullAttr?.Attribute?.toLowerCase() === 'metallurgy') return true;
      return (fullAttr?.Sequence || 0) <= currentSeq;
    });
  }
  
  hidePartNumber();
  
  if (isNaN(optionIndex)) {
    document.getElementById(`code_attr_${attrIndex}`).textContent = '';
    hideOptionsPanel();
    return;
  }
  
  const option = attribute.Options[optionIndex];
  
  const existingIndex = currentSelection.attributes.findIndex(a => a.attributeId === attribute.AttributeID);
  const newSelection = {
    attributeId: attribute.AttributeID,
    attribute: attribute.Attribute,
    code: option.Code,
    description: option.Description,
    index: optionIndex
  };
  
  if (existingIndex >= 0) {
    currentSelection.attributes[existingIndex] = newSelection;
  } else {
    currentSelection.attributes.push(newSelection);
  }
  
  document.getElementById(`code_attr_${attrIndex}`).textContent = (option.Code || '').toUpperCase();
  
  refreshCurrentOptionsPanel();
  
  if (isMetallurgy) {
    const firstOtherAttr = sortedAttributes.find((a, i) => 
      a.Attribute?.toLowerCase() !== 'metallurgy' && i !== attrIndex
    );
    if (firstOtherAttr) {
      const firstOtherIndex = sortedAttributes.findIndex(a => a.AttributeID === firstOtherAttr.AttributeID);
      const nextSelect = document.getElementById(`select_attr_${firstOtherIndex}`);
      if (nextSelect) {
        nextSelect.disabled = false;
        showOptionsPanel(firstOtherAttr, firstOtherIndex, sortedAttributes);
      }
    }
  } else {
    const nextAttr = sortedAttributes.find((a, i) => 
      a.Attribute?.toLowerCase() !== 'metallurgy' && 
      (a.Sequence || 0) > (attribute.Sequence || 0)
    );
    
    if (nextAttr) {
      const nextIndex = sortedAttributes.findIndex(a => a.AttributeID === nextAttr.AttributeID);
      const nextSelect = document.getElementById(`select_attr_${nextIndex}`);
      if (nextSelect) {
        nextSelect.disabled = false;
        showOptionsPanel(nextAttr, nextIndex, sortedAttributes);
      }
    } else {
      const allSelected = sortedAttributes.every(attr => {
        return currentSelection.attributes.some(a => a.attributeId === attr.AttributeID);
      });
      if (allSelected) {
        hideOptionsPanel();
        showPartNumber();
      } else {
        hideOptionsPanel();
      }
    }
  }
}

function showOptionsPanel(attribute, attrIndex, sortedAttributes) {
  const panel = document.getElementById('optionsPanel');
  const title = document.getElementById('optionsPanelTitle');
  const container = document.getElementById('optionsTableContainer');
  
  currentOptionsPanel.attrIndex = attrIndex;
  currentOptionsPanel.sortedAttributes = sortedAttributes;
  
  title.textContent = `SELECT ${(attribute.Attribute || '').toUpperCase()}`;
  container.innerHTML = renderOptionsTable(attribute, attrIndex, sortedAttributes);
  panel.classList.remove('hidden');
}

function hideOptionsPanel() {
  document.getElementById('optionsPanel').classList.add('hidden');
  currentOptionsPanel.attrIndex = null;
  currentOptionsPanel.sortedAttributes = null;
}

function renderOptionsTable(attribute, attrIndex, sortedAttributes) {
  if (!attribute.Options || attribute.Options.length === 0) {
    return '<div class="empty-state">No options available</div>';
  }
  
  const columns = getTableColumns(attribute.Options);
  
  const sortedOptions = attribute.Options
    .map((option, optIdx) => ({ option, optIdx }))
    .sort((a, b) => (a.option.Code || '').localeCompare(b.option.Code || ''));
  
  let html = '<table><thead><tr>';
  columns.forEach(col => {
    html += `<th>${escapeHTML((col || '').toUpperCase())}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  sortedOptions.forEach(({ option, optIdx }) => {
    const isExcluded = isOptionExcluded(option, attrIndex);
    const isSelected = currentSelection.attributes[attrIndex]?.index === optIdx;
    
    let rowClass = '';
    let onclick = '';
    
    if (isExcluded) {
      rowClass = 'excluded-row';
    } else {
      rowClass = isSelected ? 'selected-row clickable-row' : 'clickable-row';
      onclick = `onclick="selectOptionFromTable(${attrIndex}, ${optIdx})"`;
    }
    
    html += `<tr class="${rowClass}" ${onclick}>`;
    columns.forEach(col => {
      const value = option[col] !== undefined ? option[col] : '';
      html += `<td>${escapeHTML(String(value).toUpperCase())}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  return html;
}

function getTableColumns(options) {
  const columnSet = new Set();
  options.forEach(opt => {
    Object.keys(opt).forEach(key => columnSet.add(key));
  });
  
  const priorityOrder = ['Code', 'Description', 'PriceFlag', 'RangeIndicator', 'RangeMin', 'RangeMax', 'ExcludeIndicator', 'ExcludeValues'];
  const columns = [];
  
  priorityOrder.forEach(col => {
    if (columnSet.has(col)) {
      columns.push(col);
      columnSet.delete(col);
    }
  });
  
  columnSet.forEach(col => columns.push(col));
  
  return columns;
}

function refreshCurrentOptionsPanel() {
  if (currentOptionsPanel.attrIndex !== null && currentOptionsPanel.sortedAttributes) {
    const attr = currentOptionsPanel.sortedAttributes[currentOptionsPanel.attrIndex];
    if (attr) {
      const container = document.getElementById('optionsTableContainer');
      container.innerHTML = renderOptionsTable(attr, currentOptionsPanel.attrIndex, currentOptionsPanel.sortedAttributes);
    }
  }
}

function isOptionExcluded(option, currentAttrIndex) {
  if (!currentSelection.attributes || currentSelection.attributes.length === 0) {
    return false;
  }
  
  if (option.ExcludeIndicator === 2 && option.ExcludeValues) {
    const excludedCodes = option.ExcludeValues.split(',').map(s => s.trim());
    for (const prevSelection of currentSelection.attributes) {
      if (prevSelection && excludedCodes.includes(prevSelection.code)) {
        return true;
      }
    }
  }
  
  if (option.RangeIndicator === 1 && option.RangeMin != null && option.RangeMax != null) {
    let inRange = false;
    for (const prevSelection of currentSelection.attributes) {
      if (prevSelection && prevSelection.code) {
        if (prevSelection.code >= option.RangeMin && prevSelection.code <= option.RangeMax) {
          inRange = true;
          break;
        }
      }
    }
    if (!inRange) {
      return true;
    }
  }
  
  return false;
}

function selectOptionFromTable(attrIndex, optionIndex) {
  const select = document.getElementById(`select_attr_${attrIndex}`);
  if (select) {
    const subClass = currentSelection.subClass;
    const sortedAttributes = [...subClass.Attributes].sort((a, b) => 
      (a.Sequence || 0) - (b.Sequence || 0)
    );
    const attribute = sortedAttributes[attrIndex];
    
    if (select.options.length <= 1) {
      const sortedOptions = attribute.Options
        .map((opt, idx) => ({ opt, idx }))
        .sort((a, b) => (a.opt.Code || '').localeCompare(b.opt.Code || ''));
      
      select.innerHTML = '<option value="">--</option>' +
        sortedOptions.map(item => 
          `<option value="${item.idx}">${escapeHTML((item.opt.Code || '').toUpperCase())} - ${escapeHTML((item.opt.Description || '').toUpperCase())}</option>`
        ).join('');
    }
    
    select.value = optionIndex;
    select.dispatchEvent(new Event('change'));
  }
}

function showPartNumber() {
  const subClass = currentSelection.subClass;
  const sortedAttributes = [...subClass.Attributes].sort((a, b) => 
    (a.Sequence || 0) - (b.Sequence || 0)
  );
  
  const metallurgyAttr = currentSelection.attributes.find(attr => {
    const fullAttr = sortedAttributes.find(a => a.AttributeID === attr.attributeId);
    return fullAttr?.Attribute?.toLowerCase() === 'metallurgy';
  });
  
  const otherAttrs = currentSelection.attributes.filter(attr => {
    const fullAttr = sortedAttributes.find(a => a.AttributeID === attr.attributeId);
    return fullAttr?.Attribute?.toLowerCase() !== 'metallurgy';
  });
  
  const partNumOtherAttributes = otherAttrs
    .map(attr => {
      const fullAttr = sortedAttributes.find(a => a.AttributeID === attr.attributeId);
      return { ...attr, seq: fullAttr?.Sequence || 0 };
    })
    .sort((a, b) => a.seq - b.seq);
  
  const codes = [
    currentSelection.masterClass.CCode,
    ...(metallurgyAttr ? [metallurgyAttr.code] : []),
    ...partNumOtherAttributes.map(a => a.code)
  ];
  
  if (currentSelection.masterClass.CCode && currentSelection.subClass.SCode) {
    codes.push(currentSelection.subClass.SCode);
  } else if (currentSelection.subClass.SCode) {
    codes.splice(1, 0, currentSelection.subClass.SCode);
  }
  
  const partNum = codes.join('').toUpperCase();
  
  const descOtherAttributes = otherAttrs
    .map(attr => {
      const fullAttr = sortedAttributes.find(a => a.AttributeID === attr.attributeId);
      return { ...attr, seq1: fullAttr?.Sequence1 ?? fullAttr?.Sequence ?? 0 };
    })
    .sort((a, b) => a.seq1 - b.seq1);
  
  const descriptions = [
    currentSelection.masterClass.CDesc,
    currentSelection.subClass.SDesc || currentSelection.subClass.SName,
    ...descOtherAttributes.map(a => a.description),
    ...(metallurgyAttr ? [metallurgyAttr.description] : [])
  ].filter(desc => desc != null && String(desc).trim() !== '');
  const partDesc = descriptions.join(', ').toUpperCase();
  
  document.getElementById('partNumValue').textContent = partNum;
  document.getElementById('partDescValue').textContent = partDesc;
  document.getElementById('partNumberDisplay').classList.remove('hidden');
}

function hidePartNumber() {
  document.getElementById('partNumberDisplay').classList.add('hidden');
}

function clearAttributeDropdowns() {
  document.getElementById('metallurgyDropdown').innerHTML = '';
  document.getElementById('attributeDropdowns').innerHTML = '';
}

function resetBuilder() {
  currentSelection = {
    masterClass: null,
    subClass: null,
    attributes: []
  };
  renderDropdowns();
  hidePartNumber();
  hideOptionsPanel();
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async function() {
  try {
    // Fetch attributes.json
    const response = await fetch('attributes.json');
    if (!response.ok) {
      throw new Error(`Failed to load attributes.json: ${response.statusText}`);
    }
    const data = await response.json();
    initHorizontalBuilder(data);
    document.getElementById('loadedFileName').textContent = '✓ Loaded attributes.json';
  } catch (error) {
    console.error('Error loading data:', error);
    document.getElementById('dropdownsContainer').innerHTML = 
      `<div class="empty-state">Error loading attributes.json. Please ensure the file exists or load a different JSON file.</div>`;
  }
  
  // File picker handler
  document.getElementById('jsonFilePicker').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const json = JSON.parse(evt.target.result);
        initHorizontalBuilder(json);
        document.getElementById('loadedFileName').textContent = '✓ Loaded: ' + file.name;
      } catch (err) {
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  });
});
