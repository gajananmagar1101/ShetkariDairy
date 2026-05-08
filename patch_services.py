import os
import re

SERVICE_DIR = "dairy-backend/src/main/java/com/dairy/backend/service/"

def patch_service(filepath):
    if "UserService" in filepath:
        return

    with open(filepath, 'r') as f:
        content = f.read()

    if "SecurityUtils" not in content:
        # Add import
        content = re.sub(r'(package com.dairy.backend.service;)', r'\1\n\nimport com.dairy.backend.util.SecurityUtils;', content)

    # We need to find methods and inject `String userId = SecurityUtils.getCurrentUserId();` at the beginning.
    # And we need to replace repo calls like `repository.findBy` with `repository.findByUserIdAnd`
    # This is quite complex to do with regex reliably.
    
    # Simple replacement rules for repository calls:
    content = content.replace(".findByPhone(", ".findByUserIdAndPhone(SecurityUtils.getCurrentUserId(), ")
    content = content.replace(".findByIsActiveTrue(", ".findByUserIdAndIsActiveTrue(SecurityUtils.getCurrentUserId()")
    content = content.replace(".findByCustomerId(", ".findByUserIdAndCustomerId(SecurityUtils.getCurrentUserId(), ")
    content = content.replace(".findByWorkerIdAndDateBetween(", ".findByUserIdAndWorkerIdAndDateBetween(SecurityUtils.getCurrentUserId(), ")
    content = content.replace(".findByCustomerIdAndDateBetween(", ".findByUserIdAndCustomerIdAndDateBetween(SecurityUtils.getCurrentUserId(), ")
    content = content.replace(".findByDateBetween(", ".findByUserIdAndDateBetween(SecurityUtils.getCurrentUserId(), ")
    content = content.replace(".findByDate(", ".findByUserIdAndDate(SecurityUtils.getCurrentUserId(), ")
    content = content.replace(".existsByCustomerIdAndDate(", ".existsByUserIdAndCustomerIdAndDate(SecurityUtils.getCurrentUserId(), ")
    content = content.replace(".countByIsActiveTrue()", ".countByUserIdAndIsActiveTrue(SecurityUtils.getCurrentUserId())")
    content = content.replace(".findByInvoiceMonthAndInvoiceYear(", ".findByUserIdAndInvoiceMonthAndInvoiceYear(SecurityUtils.getCurrentUserId(), ")
    content = content.replace(".findAll()", ".findByUserId(SecurityUtils.getCurrentUserId())")

    # For saving entities, we need to set the userId before repository.save(entity)
    # We can replace `repository.save(` with `setUserIdAndSave(` and write a helper, or just regex it.
    # A better way is to do it manually for `save()` methods, or just trust regex:
    # Actually, if the entity has a `setUserId` method, we can do it. But regex for this is risky.
    # Let's replace `.save(` with `.save(` but wait, we need to set the userId before.
    # I'll just write a script to do the repository query replacements, and I'll manually fix the `.save` calls.

    with open(filepath, 'w') as f:
        f.write(content)
        print(f"Patched queries in {filepath}")

for filename in os.listdir(SERVICE_DIR):
    if filename.endswith(".java"):
        patch_service(os.path.join(SERVICE_DIR, filename))
