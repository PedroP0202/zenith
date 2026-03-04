require 'xcodeproj'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Ensure SystemCapabilities exists for targets
project.root_object.attributes['TargetAttributes'] ||= {}
target_attributes = project.root_object.attributes['TargetAttributes']

# Enable App Groups for both App and Widget targets
project.targets.each do |target|
  if target.name == 'App' || target.name == 'ZenithWidgetExtension'
    target_attributes[target.uuid] ||= {}
    target_attributes[target.uuid]['SystemCapabilities'] ||= {}
    target_attributes[target.uuid]['SystemCapabilities']['com.apple.ApplicationGroups.iOS'] = { 'enabled' => 1 }
    puts "Enabled App Groups Capability for target: #{target.name}"
  end
end

project.save
puts "Successfully added SystemCapabilities string to project.pbxproj"
