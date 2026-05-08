import os

def patch_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

replacements_customer = {
    ".deleteByCustomerId(": ".deleteByUserIdAndCustomerId(SecurityUtils.getCurrentUserId(), "
}

replacements_report = {
    ".findByDateBetween(": ".findByUserIdAndDateBetween(SecurityUtils.getCurrentUserId(), ",
    "package com.dairy.backend.controller;": "package com.dairy.backend.controller;\n\nimport com.dairy.backend.util.SecurityUtils;"
}

patch_file("dairy-backend/src/main/java/com/dairy/backend/service/CustomerService.java", replacements_customer)
patch_file("dairy-backend/src/main/java/com/dairy/backend/controller/ReportController.java", replacements_report)
