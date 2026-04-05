package com.example.temp_voiceforge_app.dto;

public class RailwayAnnouncementRequest {

    private String trainNumber;
    private String trainName;
    private String sourceStation;
    private String destinationStation;
    private String platformNumber;
    private String status;
    private String delayMinutes;

    public RailwayAnnouncementRequest() {}

    public String getTrainNumber() { return trainNumber; }
    public void setTrainNumber(String trainNumber) { this.trainNumber = trainNumber; }

    public String getTrainName() { return trainName; }
    public void setTrainName(String trainName) { this.trainName = trainName; }

    public String getSourceStation() { return sourceStation; }
    public void setSourceStation(String sourceStation) { this.sourceStation = sourceStation; }

    public String getDestinationStation() { return destinationStation; }
    public void setDestinationStation(String destinationStation) { this.destinationStation = destinationStation; }

    public String getPlatformNumber() { return platformNumber; }
    public void setPlatformNumber(String platformNumber) { this.platformNumber = platformNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelayMinutes() { return delayMinutes; }
    public void setDelayMinutes(String delayMinutes) { this.delayMinutes = delayMinutes; }
}

