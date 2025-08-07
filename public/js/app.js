document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing PFSCGen...');
    
    let groupIdx = 0;
    const groupsDiv = document.getElementById('groups');
    const groupTemplate = document.getElementById('groupTemplate');
    const targetTemplate = document.getElementById('targetTemplate');
    const labelTemplate = document.getElementById('labelTemplate');
    const yamlOutput = document.getElementById('yamlOutput');

    console.log('Elements found:', {
        groupsDiv: !!groupsDiv,
        groupTemplate: !!groupTemplate,
        targetTemplate: !!targetTemplate,
        labelTemplate: !!labelTemplate,
        yamlOutput: !!yamlOutput
    });

    function addKeyValue(container, key = '', value = '') {
        console.log('Adding key-value pair:', key, value);
        const frag = labelTemplate.content.cloneNode(true);
        const keyInput = frag.querySelector('.label-key');
        const valueInput = frag.querySelector('.label-value');
        const removeBtn = frag.querySelector('.remove-label');
        const kvRow = frag.querySelector('.kv-row');
        
        keyInput.value = key;
        valueInput.value = value;
        
        removeBtn.addEventListener('click', function(e) {
            console.log('Removing label row');
            e.preventDefault();
            kvRow.remove();
            updateYaml();
        });
        
        keyInput.addEventListener('input', updateYaml);
        valueInput.addEventListener('input', updateYaml);
        
        container.appendChild(frag);
    }

    function addTarget(container, target = '') {
        console.log('Adding target:', target);
        const frag = targetTemplate.content.cloneNode(true);
        const targetInput = frag.querySelector('.target-input');
        const removeBtn = frag.querySelector('.remove-target');
        const kvRow = frag.querySelector('.kv-row');
        
        targetInput.value = target;
        
        removeBtn.addEventListener('click', function(e) {
            console.log('Removing target row');
            e.preventDefault();
            kvRow.remove();
            updateYaml();
        });
        
        targetInput.addEventListener('input', updateYaml);
        
        container.appendChild(frag);
    }

    function addGroup(groupData = null) {
        console.log('Adding group:', groupData);
        const groupFrag = groupTemplate.content.cloneNode(true);
        const groupWrapper = groupFrag.querySelector('.group-wrapper');
        groupIdx++;
        
        // Set unique ID for group name
        const groupNameInput = groupWrapper.querySelector('.group-name');
        groupNameInput.id = 'group-name-' + groupIdx;
        
        if (groupData) {
            groupNameInput.value = groupData.name || '';
        }
        
        // Group targets
        const groupTargetsDiv = groupWrapper.querySelector('.group-targets');
        (groupData && groupData.targets ? groupData.targets : ['']).forEach(target => addTarget(groupTargetsDiv, target));
        
        // Add target button
        const addTargetBtn = groupWrapper.querySelector('.add-target');
        addTargetBtn.addEventListener('click', function(e) {
            console.log('Add target button clicked');
            e.preventDefault();
            addTarget(groupTargetsDiv); 
        });
        
        // Group labels
        const groupLabelsDiv = groupWrapper.querySelector('.group-labels');
        (groupData && groupData.labels ? Object.entries(groupData.labels) : [['','']]).forEach(([k,v]) => addKeyValue(groupLabelsDiv, k, v));
        
        // Add label button
        const addLabelBtn = groupWrapper.querySelector('.add-group-label');
        addLabelBtn.addEventListener('click', function(e) {
            console.log('Add label button clicked');
            e.preventDefault();
            addKeyValue(groupLabelsDiv); 
        });
        
        // Collapse/expand logic
        const chevronBtn = groupWrapper.querySelector('.chevron-btn');
        const chevronIcon = chevronBtn.querySelector('i');
        const groupCard = groupWrapper.querySelector('.group-card');
        const groupTitle = groupWrapper.querySelector('.group-title');
        
        // Sync group title with input
        function syncGroupTitle() {
            groupTitle.textContent = groupNameInput.value || 'Unnamed Group';
        }
        
        groupNameInput.addEventListener('input', function() {
            syncGroupTitle();
            updateYaml();
        });
        
        syncGroupTitle();
        
        chevronBtn.addEventListener('click', function(e) {
            console.log('Chevron button clicked');
            e.preventDefault();
            groupCard.classList.toggle('collapsed');
            chevronIcon.classList.toggle('bi-chevron-down');
            chevronIcon.classList.toggle('bi-chevron-right');
            syncGroupTitle();
        });
        
        // Remove group button
        const removeGroupBtn = groupWrapper.querySelector('.remove-group');
        removeGroupBtn.addEventListener('click', function(e) {
            console.log('Remove group button clicked');
            e.preventDefault();
            groupWrapper.remove();
            updateYaml();
        });
        
        groupsDiv.appendChild(groupWrapper);
        updateYaml();
    }

    function updateYaml() {
        console.log('Updating JSON configuration...');
        const groups = [];
        
        document.querySelectorAll('.group-wrapper').forEach(groupWrapper => {
            const targets = [];
            const labels = {};
            
            // Collect targets - include all targets even if empty
            groupWrapper.querySelectorAll('.target-input').forEach(input => {
                targets.push(input.value.trim());
            });
            
            // Collect labels - include all labels even if empty
            groupWrapper.querySelectorAll('.label-key').forEach((keyInput, index) => {
                const valueInput = groupWrapper.querySelectorAll('.label-value')[index];
                if (keyInput.value.trim() || valueInput.value.trim()) {
                    labels[keyInput.value.trim() || 'key'] = valueInput.value.trim() || 'value';
                }
            });
            
            // Always add the group, even with empty targets
            groups.push({ targets, labels });
        });
        
        console.log('Collected groups:', groups);
        
        if (groups.length === 0) {
            yamlOutput.textContent = '// Please add at least one group...';
            return;
        }
        
        // Use backend API to generate JSON
        fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(groups)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                yamlOutput.textContent = data.config;
            } else {
                yamlOutput.textContent = `// Error: ${data.error}`;
            }
        })
        .catch(error => {
            console.error('Error generating JSON:', error);
            yamlOutput.textContent = `// Error: ${error.message}`;
        });
    }

    // Add Group button
    const addGroupBtn = document.getElementById('addGroupBtn');
    if (addGroupBtn) {
        console.log('Add group button found, adding event listener');
        addGroupBtn.addEventListener('click', function(e) {
            console.log('Add group button clicked');
            e.preventDefault();
            addGroup(); 
            updateYaml(); 
        });
    } else {
        console.error('Add group button not found!');
    }

    // Download Config button functionality
    const downloadConfigBtn = document.getElementById('downloadConfigBtn');
    if (downloadConfigBtn) {
        console.log('Download button found, adding event listener');
        downloadConfigBtn.addEventListener('click', function(e) {
            console.log('Download button clicked');
            e.preventDefault();
            const json = yamlOutput.textContent;
            if (json.startsWith('// Error:') || json.startsWith('// Please add')) {
                console.log('No valid content to download');
                return; // Don't download if there's an error or no content
            }
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'prometheus-file-sd-config.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
        });
    } else {
        console.error('Download button not found!');
    }

    // Add a default example group on load
    console.log('Adding default example group');
    addGroup({
        name: 'example',
        targets: ['youtube.com'],
        labels: {
            'instance_name': 'Facebook',
            'platform': 'facebook'
        }
    });
}); 