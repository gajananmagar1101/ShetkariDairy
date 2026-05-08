import os
import re

REPO_DIR = "dairy-backend/src/main/java/com/dairy/backend/repository/"

def patch_repo(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Special handling for UserRepository (we don't touch it)
    if "UserRepository" in filepath:
        return

    # Add findByUserId to all repos
    entity_name = re.search(r'MongoRepository<([^,]+),', content).group(1)
    
    # Replace existing methods to include UserId
    # e.g., List<Attendance> findByWorkerIdAndDateBetween(String workerId, LocalDate startDate, LocalDate endDate);
    # becomes: List<Attendance> findByUserIdAndWorkerIdAndDateBetween(String userId, String workerId, LocalDate startDate, LocalDate endDate);
    
    def replacer(match):
        return_type = match.group(1)
        method_name = match.group(2)
        params = match.group(3)
        
        # Don't double patch
        if "UserId" in method_name:
            return match.group(0)
            
        new_method_name = method_name.replace("findBy", "findByUserIdAnd")
        new_method_name = new_method_name.replace("countBy", "countByUserIdAnd")
        new_method_name = new_method_name.replace("existsBy", "existsByUserIdAnd")
        new_method_name = new_method_name.replace("deleteBy", "deleteByUserIdAnd")
        
        # Fix cases where it was just findByDate -> findByUserIdAndDate
        
        if params.strip() == "":
            new_params = "String userId"
        else:
            new_params = "String userId, " + params
            
        return f"{return_type} {new_method_name}({new_params});"

    # Match method signatures in interfaces
    # Pattern: <ReturnType> <methodName>(<params>);
    pattern = r'^\s*(List<[^>]+>|Optional<[^>]+>|long|boolean|void)\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*;'
    
    new_content = re.sub(pattern, replacer, content, flags=re.MULTILINE)
    
    # Also add List<Entity> findByUserId(String userId); if not exists
    if "findByUserId(" not in new_content and "UserRepository" not in filepath:
        insert_idx = new_content.rfind("}")
        if insert_idx != -1:
            method_str = f"    List<{entity_name}> findByUserId(String userId);\n"
            new_content = new_content[:insert_idx] + method_str + new_content[insert_idx:]

    with open(filepath, 'w') as f:
        f.write(new_content)
        print(f"Patched {filepath}")

for filename in os.listdir(REPO_DIR):
    if filename.endswith(".java"):
        patch_repo(os.path.join(REPO_DIR, filename))
