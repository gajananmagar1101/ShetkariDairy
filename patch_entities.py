import os
import re

ENTITY_DIR = "dairy-backend/src/main/java/com/dairy/backend/entity/"

def patch_entity(filepath):
    # Exclude certain entities
    excludes = ["User.java", "Role.java", "Session.java", "AttendanceStatus.java", "PaymentStatus.java"]
    for ex in excludes:
        if ex in filepath:
            return

    with open(filepath, 'r') as f:
        content = f.read()

    # if userId already exists, make sure it's uncommented and valid
    if "private String userId;" in content:
        return
        
    if "private String userId" in content:
        # It might be commented out or something like `private String userId; // Optional link to User collection`
        # Let's replace it with a clean `private String userId;`
        content = re.sub(r'private String userId.*?;\s*//.*', 'private String userId;', content)
        content = re.sub(r'//\s*private String userId;', 'private String userId;', content)
        if "private String userId;" in content:
            with open(filepath, 'w') as f:
                f.write(content)
            return

    # Find the class definition and insert `private String userId;` as the first field
    pattern = r'(public\s+class\s+[a-zA-Z0-9_]+\s*(?:implements\s+[a-zA-Z0-9_]+)?\s*\{)'
    match = re.search(pattern, content)
    if match:
        insert_idx = match.end()
        new_content = content[:insert_idx] + "\n    private String userId;\n" + content[insert_idx:]
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Patched {filepath}")

for filename in os.listdir(ENTITY_DIR):
    if filename.endswith(".java"):
        patch_entity(os.path.join(ENTITY_DIR, filename))
