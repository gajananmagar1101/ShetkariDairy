FROM maven:3.9.6-eclipse-temurin-17

WORKDIR /app

COPY . .

WORKDIR /app/dairy-backend

RUN mvn clean package -DskipTests

EXPOSE 8080

CMD ["java", "-jar", "target/dairy-backend-0.0.1-SNAPSHOT.jar"]
